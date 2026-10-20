
"""
Evaluator for Bank Transaction Anomaly Detection.

Computes precision, recall, F1, false positive rate, average precision,
Precision@K, Recall@K, confusion matrices, and model agreement.

Supports dynamic evaluations and precomputed benchmark artifacts.
"""

import numpy as np
import pandas as pd

from typing import Dict, Any, List, Optional
from sklearn.metrics import average_precision_score

from src.artifacts_manager import ArtifactsManager


class Evaluator:
    """Evaluates anomaly detection methods against ground-truth labels."""

    def __init__(self, artifacts_mgr: ArtifactsManager):
        self.artifacts = artifacts_mgr

    def evaluate_dataset(
        self,
        scored_df: pd.DataFrame,
        y: np.ndarray,
        runtimes: Optional[Dict[str, float]] = None,
        custom_Ks: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Compute evaluation metrics for a labelled scored dataset."""

        if runtimes is None:
            runtimes = {}

        y = np.asarray(y, dtype=int)

        if len(scored_df) != len(y):
            raise ValueError(
                "scored_df and ground-truth labels must have equal lengths."
            )

        if len(y) == 0:
            raise ValueError("Cannot evaluate an empty dataset.")

        if not np.isin(y, [0, 1]).all():
            raise ValueError("Ground-truth labels must contain only 0 and 1.")

        n_test = len(y)
        n_pos = int(np.sum(y))
        prevalence = n_pos / n_test

        if custom_Ks is None:
            default_k_candidates = [10, 20, 50, 100, 500, 1000, 5000]
            Ks = sorted(
                {k for k in default_k_candidates if k <= n_test}
                | ({n_pos} if n_pos > 0 else set())
            )
        else:
            Ks = sorted(
                {k for k in custom_Ks if 0 < k <= n_test}
                | ({n_pos} if n_pos > 0 else set())
            )

        def _eval_method(
            name: str,
            score: np.ndarray,
            flag: np.ndarray,
            secs: float,
        ):
            score = np.asarray(score, dtype=float)
            flag = np.asarray(flag, dtype=bool)

            if len(score) != n_test or len(flag) != n_test:
                raise ValueError(
                    f"Score/flag length mismatch for {name}."
                )

            if not np.isfinite(score).all():
                raise ValueError(
                    f"Non-finite scores found for {name}."
                )

            # Rank transactions from highest anomaly score to lowest.
            sort_order = np.argsort(-score, kind="stable")
            ranked_labels = y[sort_order]
            hits = np.cumsum(ranked_labels)

            tp = int(np.sum(flag & (y == 1)))
            fp = int(np.sum(flag)) - tp
            fn = n_pos - tp
            tn = n_test - tp - fp - fn

            precision = tp / max(tp + fp, 1)
            recall = tp / max(n_pos, 1)

            f1 = (
                2 * precision * recall / (precision + recall)
                if precision + recall > 0
                else 0.0
            )

            fpr = fp / max(fp + tn, 1)

            try:
                ap = (
                    float(average_precision_score(y, score))
                    if n_pos > 0
                    else 0.0
                )
            except (ValueError, TypeError):
                ap = prevalence

            row = {
                "method": name,
                "flagged": int(np.sum(flag)),
                "TP": tp,
                "FP": fp,
                "FN": fn,
                "TN": tn,
                "precision": precision,
                "recall": recall,
                "F1": f1,
                "false_positive_rate": fpr,
                "average_precision": ap,
                "seconds": secs,
            }

            for k in Ks:
                effective_k = min(k, n_test)
                top_k_hits = int(hits[effective_k - 1])

                row[f"Precision@{k}"] = top_k_hits / effective_k
                row[f"Recall@{k}"] = (
                    top_k_hits / n_pos if n_pos > 0 else 0.0
                )

            confusion_matrix = np.array(
                [[tn, fp], [fn, tp]]
            )

            return row, hits, confusion_matrix

        required_columns = [
            "amount",
            "amount_baseline_flag",
            "if_score",
            "if_flag",
            "svm_score",
            "svm_flag",
            "priority",
            "flagged",
        ]

        missing_columns = [
            col for col in required_columns
            if col not in scored_df.columns
        ]

        if missing_columns:
            raise ValueError(
                f"Missing required evaluation columns: {missing_columns}"
            )

        methods = {
            "Baseline: biggest amount": (
                scored_df["amount"].to_numpy(),
                scored_df["amount_baseline_flag"].to_numpy(),
                0.0,
            ),
            "Isolation Forest": (
                scored_df["if_score"].to_numpy(),
                scored_df["if_flag"].to_numpy(),
                runtimes.get("if_score_seconds", 0.0),
            ),
            "One-Class SVM": (
                scored_df["svm_score"].to_numpy(),
                scored_df["svm_flag"].to_numpy(),
                runtimes.get("svm_score_seconds", 0.0),
            ),
            "Combined priority score": (
                scored_df["priority"].to_numpy(),
                scored_df["flagged"].to_numpy(),
                sum(runtimes.values()),
            ),
        }

        rows = []
        curves = {}
        matrices = {}

        for name, (score, flag, secs) in methods.items():
            row, curve, cm = _eval_method(
                name, score, flag, secs
            )
            rows.append(row)
            curves[name] = curve
            matrices[name] = cm

        alert_rate = float(self.artifacts.alert_rate)

        random_row = {
            "method": "Random guessing (expected value)",
            "flagged": int(round(alert_rate * n_test)),
            "TP": np.nan,
            "FP": np.nan,
            "FN": np.nan,
            "TN": np.nan,
            "precision": prevalence,
            "recall": alert_rate,
            "F1": (
                2 * prevalence * alert_rate
                / max(prevalence + alert_rate, 1e-12)
            ),
            "false_positive_rate": alert_rate,
            "average_precision": prevalence,
            "seconds": np.nan,
        }

        for k in Ks:
            random_row[f"Precision@{k}"] = prevalence
            random_row[f"Recall@{k}"] = (
                min(k, n_test) / n_test
            )

        rows.append(random_row)
        results_df = pd.DataFrame(rows)

        # Compare model agreement against the ground-truth labels.
        if_f = scored_df["if_flag"].to_numpy(dtype=bool)
        svm_f = scored_df["svm_flag"].to_numpy(dtype=bool)

        group = np.select(
            [if_f & svm_f, if_f, svm_f],
            ["both models", "IF only", "SVM only"],
            default="neither",
        )

        agreement_tbl = (
            pd.DataFrame({"group": group, "fraud": y})
            .groupby("group")["fraud"]
            .agg(
                transactions="size",
                frauds="sum",
            )
        )

        agreement_tbl = agreement_tbl.reindex(
            ["neither", "IF only", "SVM only", "both models"]
        ).fillna(0).astype(int)

        agreement_tbl["fraud_rate_%"] = (
            agreement_tbl["frauds"]
            / agreement_tbl["transactions"].replace(0, np.nan)
            * 100.0
        ).round(3)

        return {
            "metrics_table": results_df,
            "curves": curves,
            "matrices": matrices,
            "agreement_table": agreement_tbl,
            "Ks": Ks,
            "n_test": n_test,
            "n_pos": n_pos,
            "prevalence": prevalence,
        }

    def get_benchmark_results(self) -> Dict[str, Any]:
        """
        Return saved benchmark artifacts and calculate ranking metrics
        from verified labels and saved prediction scores.
        """

        predictions = self.artifacts.test_predictions
        precision_at_k_table = None
        n_test = 0
        n_pos = 0
        prevalence = 0.0

        if (
            isinstance(predictions, pd.DataFrame)
            and not predictions.empty
        ):
            df = predictions.copy()

            label_col = "isFraud_for_evaluation_only"

            score_columns = {
                "Baseline: biggest amount": "amount",
                "Isolation Forest": "if_score",
                "One-Class SVM": "svm_score",
                "Combined priority score": "priority",
            }

            if label_col in df.columns:
                labels = pd.to_numeric(
                    df[label_col], errors="coerce"
                )

                valid_labels = (
                    labels.notna()
                    & labels.isin([0, 1])
                )

                df = df.loc[valid_labels].copy()
                y = labels.loc[valid_labels].to_numpy(dtype=int)
                n_test = int(len(y))
                n_pos = int(y.sum())
                prevalence = (n_pos / n_test) if n_test else 0.0

                if len(y) > 0 and y.sum() > 0:
                    n_test = len(y)
                    n_pos = int(y.sum())

                    Ks = sorted(
                        {
                            k for k in [14, 100, 500, 1000, 5000]
                            if k <= n_test
                        }
                        | {n_pos}
                    )

                    rows = []

                    for method, score_col in score_columns.items():
                        if score_col not in df.columns:
                            continue

                        scores = pd.to_numeric(
                            df[score_col], errors="coerce"
                        ).to_numpy(dtype=float)

                        # Never calculate metrics using invalid scores.
                        if not np.isfinite(scores).all():
                            continue

                        order = np.argsort(-scores, kind="stable")
                        ranked_labels = y[order]
                        cumulative_hits = np.cumsum(ranked_labels)

                        row = {"method": method}

                        for k in Ks:
                            effective_k = min(k, n_test)
                            hits = int(
                                cumulative_hits[effective_k - 1]
                            )

                            row[f"Precision@{k}"] = (
                                hits / effective_k
                            )
                            row[f"Recall@{k}"] = (
                                hits / n_pos
                            )

                        rows.append(row)

                    # Expected random-ranking reference values.
                    prevalence = n_pos / n_test

                    random_row = {
                        "method": "Random guessing (expected value)"
                    }

                    for k in Ks:
                        random_row[f"Precision@{k}"] = prevalence
                        random_row[f"Recall@{k}"] = (
                            min(k, n_test) / n_test
                        )

                    rows.append(random_row)

                    if rows:
                        precision_at_k_table = pd.DataFrame(rows)

        return {
            "metrics_table": self.artifacts.metrics_table,
            "agreement_table": self.artifacts.model_agreement_table,
            "runtime_seconds": self.artifacts.runtime_seconds,
            "test_predictions": predictions,
            "precision_at_k_table": precision_at_k_table,
            "n_test": n_test,
            "n_pos": n_pos,
            "prevalence": prevalence,
        }
