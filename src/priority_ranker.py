"""
Priority Ranker for Bank Transaction Anomaly Detection
Combines unsupervised model scores and behavioral heuristics into an operational
priority score (0-100).
CRITICAL: The priority score is an operational triage/investigation ranking, NOT a fraud probability.
"""

import time
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from src.artifacts_manager import ArtifactsManager


def percentile(x: np.ndarray, ref: np.ndarray) -> np.ndarray:
    """
    Computes empirical percentile rank against training reference distribution.
    Matches notebook definition: share of the reference values that are <= x.
    """
    if len(ref) == 0:
        return np.zeros(len(x), dtype=np.float64)
    return np.searchsorted(ref, x, side="right") / float(len(ref))


def generate_explanation(row: Any) -> str:
    """
    Generates human-readable compliance and audit explanation.
    Matches exact logic from notebook Cell 13.
    """
    if_flag = bool(getattr(row, "if_flag", False))
    svm_flag = bool(getattr(row, "svm_flag", False))
    
    if if_flag and svm_flag:
        flag_src = "flagged by both models"
    elif if_flag:
        flag_src = "flagged by Isolation Forest"
    elif svm_flag:
        flag_src = "flagged by One-Class SVM"
    else:
        flag_src = "ranked high on combined evidence (neither model alone flagged it)"

    txn_type = str(getattr(row, "type", "TRANSACTION"))
    amt = float(getattr(row, "amount", 0.0))
    why = [flag_src, f"{txn_type} of {amt:,.0f}"]

    # Sender amount ratio
    s_diff = float(getattr(row, "sender_amount_vs_usual", 0.0))
    s_ratio = float(np.exp(s_diff))
    if s_ratio >= 3.0 or s_ratio <= (1.0 / 3.0):
        why.append(
            f"amount is {s_ratio:.1f}x the sender's usual amount (or the usual amount for this type if the sender is new)"
        )

    # Recipient amount ratio
    r_diff = float(getattr(row, "recipient_amount_vs_usual", 0.0))
    is_merchant = bool(getattr(row, "recipient_is_merchant", False))
    r_ratio = float(np.exp(r_diff))
    if (r_ratio >= 3.0 or r_ratio <= (1.0 / 3.0)) and not is_merchant:
        why.append(f"amount is {r_ratio:.1f}x the recipient's usual amount")

    # Sender account emptied
    sender_emptied = bool(getattr(row, "sender_emptied", False))
    old_orig = float(getattr(row, "oldbalanceOrg", 0.0))
    if sender_emptied:
        why.append(f"sender account emptied ({old_orig:,.0f} -> 0)")

    # Recipient empty before
    recipient_empty_before = bool(getattr(row, "recipient_empty_before", False))
    if recipient_empty_before:
        why.append("recipient account had zero balance before")

    # Balance mismatch
    new_orig = float(getattr(row, "newbalanceOrig", 0.0))
    off = abs(new_orig - old_orig) - amt
    if abs(off) > max(1.0, 0.01 * amt):
        why.append(f"sender's balance change differs from the amount by {off:,.0f}")

    return "; ".join(why)


class PriorityRanker:
    """Computes operational priority score and ranks investigation candidates."""

    def __init__(self, artifacts_mgr: ArtifactsManager):
        self.artifacts = artifacts_mgr

    def calculate(
        self,
        F: pd.DataFrame,
        clean_df: pd.DataFrame,
        scoring_results: Dict[str, Any],
        y: Optional[np.ndarray] = None,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Calculates priority table, component breakdowns, and explanations.
        
        Returns:
            scored_df: Complete dataframe with scores, components, priority, and flags
            investigation_queue: Subset of flagged transactions sorted by priority descending
            summary_stats: High-level KPI dictionary
        """
        t0 = time.perf_counter()
        refs = self.artifacts.percentile_references
        weights = self.artifacts.weights
        if not weights:
            weights = {"severity": 0.50, "behaviour": 0.25, "agreement": 0.15, "urgency": 0.10}

        s_if = scoring_results["if_score"]
        s_svm = scoring_results["svm_score"]
        f_if = scoring_results["if_flag"]
        f_svm = scoring_results["svm_flag"]

        # Component 1: Severity (50%)
        ref_if = refs.get("if", np.array([]))
        ref_svm = refs.get("svm", np.array([]))
        severity = (percentile(s_if, ref_if) + percentile(s_svm, ref_svm)) / 2.0

        # Component 2: Behaviour (25%)
        ref_s_dev = refs.get("sender_dev", np.array([]))
        ref_r_dev = refs.get("recipient_dev", np.array([]))
        s_dev = np.abs(F["sender_amount_vs_usual"].to_numpy())
        r_dev = np.abs(F["recipient_amount_vs_usual"].to_numpy())
        behaviour = np.maximum(percentile(s_dev, ref_s_dev), percentile(r_dev, ref_r_dev))

        # Component 3: Agreement (15%)
        agreement = (f_if.astype(float) + f_svm.astype(float)) / 2.0

        # Component 4: Urgency (10%)
        ref_log_amt = refs.get("log_amount", np.array([]))
        s_emptied = F["sender_emptied"].to_numpy(dtype=float)
        r_empty_before = F["recipient_empty_before"].to_numpy(dtype=float)
        urgency = (s_emptied + r_empty_before + percentile(F["log_amount"].to_numpy(), ref_log_amt)) / 3.0

        # Total priority score (0 to 100)
        total_priority = 100.0 * (
            weights["severity"] * severity
            + weights["behaviour"] * behaviour
            + weights["agreement"] * agreement
            + weights["urgency"] * urgency
        )

        priority_thr = float(self.artifacts.thresholds.get("priority", 82.68546))
        flagged = total_priority >= priority_thr
        runtime_priority = time.perf_counter() - t0

        # Assemble comprehensive dataframe
        scored_df = clean_df.copy()
        scored_df["if_score"] = s_if
        scored_df["svm_score"] = s_svm
        scored_df["if_flag"] = f_if
        scored_df["svm_flag"] = f_svm
        scored_df["severity"] = severity
        scored_df["behaviour"] = behaviour
        scored_df["agreement"] = agreement
        scored_df["urgency"] = urgency
        scored_df["priority"] = total_priority
        scored_df["flagged"] = flagged
        scored_df["amount_baseline_flag"] = scoring_results["amount_flag"]
        
        # Attach internal features for audit
        scored_df["sender_amount_vs_usual"] = F["sender_amount_vs_usual"].to_numpy()
        scored_df["recipient_amount_vs_usual"] = F["recipient_amount_vs_usual"].to_numpy()
        scored_df["sender_emptied"] = F["sender_emptied"].to_numpy()
        scored_df["recipient_empty_before"] = F["recipient_empty_before"].to_numpy()
        scored_df["recipient_is_merchant"] = F["recipient_is_merchant"].to_numpy()

        if y is not None:
            scored_df["isFraud_for_evaluation_only"] = y

        # Build investigation queue (flagged rows sorted by priority descending)
        investigation_queue = scored_df[scored_df["flagged"]].sort_values("priority", ascending=False).copy()
        if not investigation_queue.empty:
            investigation_queue.insert(0, "rank", np.arange(1, len(investigation_queue) + 1))
            investigation_queue["explanation"] = [generate_explanation(r) for r in investigation_queue.itertuples()]
        else:
            investigation_queue["rank"] = []
            investigation_queue["explanation"] = []

        summary_stats = {
            "total_transactions": len(scored_df),
            "flagged_by_priority": int(flagged.sum()),
            "flagged_pct": float(flagged.mean() * 100),
            "flagged_by_if": int(f_if.sum()),
            "flagged_by_svm": int(f_svm.sum()),
            "flagged_by_amount_baseline": int(scoring_results["amount_flag"].sum()),
            "both_models_count": int((f_if & f_svm).sum()),
            "priority_threshold": priority_thr,
            "runtime_seconds": runtime_priority,
        }

        return scored_df, investigation_queue, summary_stats
