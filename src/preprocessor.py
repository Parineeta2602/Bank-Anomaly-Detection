"""
Preprocessor for Bank Transaction Anomaly Detection
Preserves exact feature engineering, history tracking, and scaling logic from notebook.
isFraud is NEVER included in model inputs and is kept strictly for evaluation.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from src.artifacts_manager import ArtifactsManager


REQUIRED_COLUMNS = [
    "step",
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
]

OPTIONAL_COLUMNS = [
    "nameOrig",
    "nameDest",
    "isFraud",
    "isFlaggedFraud",
    "row_id",
]


def validate_transaction_data(df: pd.DataFrame, expected_types: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Validates uploaded transaction dataframe.
    Checks column presence, missing values, valid transaction types, and types.
    """
    if expected_types is None:
        expected_types = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]

    errors: List[str] = []
    warnings: List[str] = []
    
    # Check minimum rows
    if df is None or len(df) == 0:
        return {
            "is_valid": False,
            "errors": ["The uploaded file contains no data rows."],
            "warnings": [],
            "row_count": 0,
            "has_fraud_label": False,
            "summary": {},
        }

    # Check required columns
    missing_required = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_required:
        errors.append(f"Missing required columns: {', '.join(missing_required)}")

    # Check transaction types
    if "type" in df.columns:
        present_types = df["type"].dropna().unique().tolist()
        invalid_types = [t for t in present_types if t not in expected_types]
        if invalid_types:
            errors.append(f"Unsupported transaction type(s) found: {invalid_types}. Allowed: {expected_types}")
    else:
        present_types = []

    # Check missing values
    null_counts = df.isnull().sum()
    critical_nulls = null_counts[null_counts > 0]
    if not critical_nulls.empty:
        warnings.append(
            f"Columns containing missing values: {dict(critical_nulls)}. Rows with missing values will be dropped or imputed."
        )

    # Check numeric columns
    numeric_cols = ["step", "amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest"]
    for col in numeric_cols:
        if col in df.columns and not pd.api.types.is_numeric_dtype(df[col]):
            try:
                pd.to_numeric(df[col])
            except Exception:
                errors.append(f"Column '{col}' must contain numeric data.")

    # Check for negative amounts
    if "amount" in df.columns:
        try:
            amt_series = pd.to_numeric(df["amount"], errors="coerce")
            neg_count = (amt_series < 0).sum()
            if neg_count > 0:
                warnings.append(f"Found {neg_count} transactions with negative amount. Please review.")
        except Exception:
            pass

    # Check if isFraud is present
    has_fraud_label = "isFraud" in df.columns
    if has_fraud_label:
        fraud_count = int(pd.to_numeric(df["isFraud"], errors="coerce").fillna(0).sum())
        fraud_pct = (fraud_count / len(df)) * 100
        fraud_info = f"Ground truth label 'isFraud' detected ({fraud_count} frauds, {fraud_pct:.3f}%). It will be strictly reserved for evaluation."
    else:
        fraud_info = "No 'isFraud' label detected. App will run in production anomaly detection mode (metrics page will show benchmark test reference)."

    # Optional columns check
    has_orig_dest = "nameOrig" in df.columns and "nameDest" in df.columns
    if not has_orig_dest:
        warnings.append("Account identifiers ('nameOrig'/'nameDest') are missing. History tracking will default to global type baseline.")

    is_valid = len(errors) == 0

    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "row_count": len(df),
        "present_types": present_types,
        "has_fraud_label": has_fraud_label,
        "fraud_info": fraud_info,
        "has_names": has_orig_dest,
        "summary": {
            "Total Rows": len(df),
            "Total Columns": len(df.columns),
            "Transaction Types": ", ".join(present_types),
            "Step Range": f"{df['step'].min()} - {df['step'].max()}" if "step" in df.columns else "N/A",
            "Max Amount": f"${df['amount'].max():,.2f}" if "amount" in df.columns else "N/A",
            "Median Amount": f"${df['amount'].median():,.2f}" if "amount" in df.columns else "N/A",
        },
    }


def past_stats(ids: np.ndarray, step: np.ndarray, log_amt: np.ndarray, window: int = 24) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Exact history calculation preserving notebook Cell 5.
    For every row, uses only the SAME account's transactions from EARLIER steps.
    """
    if len(ids) == 0:
        return np.array([]), np.array([]), np.array([])
    
    acct = pd.factorize(ids)[0].astype(np.int64)
    step = step.astype(np.int64)
    span = step.max() + 2
    key = acct * span + step
    order = np.argsort(key, kind="stable")
    sorted_key, sorted_log = key[order], log_amt[order]
    running_sum = np.concatenate(([0.0], np.cumsum(sorted_log)))
    first = np.searchsorted(sorted_key, acct * span)
    now = np.searchsorted(sorted_key, key)
    recent = np.searchsorted(sorted_key, acct * span + np.maximum(step - window, 0))
    n_past = now - first
    n_recent = now - recent
    usual = np.full(len(step), np.nan)
    has_past = n_past > 0
    usual[has_past] = (running_sum[now[has_past]] - running_sum[first[has_past]]) / n_past[has_past]
    return n_past, n_recent, usual


def signed_log(x: np.ndarray) -> np.ndarray:
    """Exact signed log function: sign(x) * log1p(abs(x))."""
    return np.sign(x) * np.log1p(np.abs(x))


class Preprocessor:
    """Transforms raw transaction data into model-ready scaled feature vectors."""

    def __init__(self, artifacts_mgr: ArtifactsManager):
        self.artifacts = artifacts_mgr

    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, pd.DataFrame, pd.DataFrame, Optional[np.ndarray]]:
        """
        Executes exact feature engineering and scaling.
        
        Returns:
            X: Scaled feature matrix (N, 16) clipped to [-10, 10]
            F: Feature dataframe containing model features plus recipient_empty_before
            clean_df: Cleaned dataframe with standard columns (isFraud excluded from model features)
            y: Ground truth binary numpy array if isFraud was present, else None
        """
        clean_df = df.copy()
        if "row_id" not in clean_df.columns:
            clean_df["row_id"] = np.arange(len(clean_df), dtype=np.int32)

        # Separate evaluation label if present
        y = None
        label_col = (
            "isFraud" if "isFraud" in clean_df.columns
            else "isFraud_for_evaluation_only"
            if "isFraud_for_evaluation_only" in clean_df.columns
            else None
        )
        if label_col is not None:
            labels = pd.to_numeric(clean_df[label_col], errors="coerce")
            # Do not silently count missing/invalid labels as non-fraud.
            if labels.notna().all() and labels.isin([0, 1]).all():
                y = labels.to_numpy(dtype=np.int8)

        # Standardize types
        types_list = self.artifacts.types
        clean_df["type"] = clean_df["type"].astype(str)
        type_code = clean_df["type"].map({t: i for i, t in enumerate(types_list)})
        if type_code.isna().any():
            type_code = type_code.fillna(0)
        code = type_code.to_numpy(dtype=np.int8)

        amt = clean_df["amount"].to_numpy(dtype=np.float64)
        old_s = clean_df["oldbalanceOrg"].to_numpy(dtype=np.float64)
        new_s = clean_df["newbalanceOrig"].to_numpy(dtype=np.float64)
        old_r = clean_df["oldbalanceDest"].to_numpy(dtype=np.float64)
        new_r = clean_df["newbalanceDest"].to_numpy(dtype=np.float64)
        step = clean_df["step"].to_numpy(dtype=np.int64)

        log_amount = np.log1p(np.maximum(amt, 0.0))

        # Merchant flag
        if "nameDest" in clean_df.columns:
            merchant = clean_df["nameDest"].astype(str).str.startswith("M").to_numpy(dtype=bool)
        else:
            merchant = np.zeros(len(clean_df), dtype=bool)

        # Account history
        if "nameOrig" in clean_df.columns and "nameDest" in clean_df.columns:
            sender_id = pd.util.hash_array(clean_df["nameOrig"].to_numpy(dtype=object))
            recipient_id = pd.util.hash_array(clean_df["nameDest"].to_numpy(dtype=object))
            s_n, s_24h, s_usual = past_stats(sender_id, step, log_amount)
            r_n, _, r_usual = past_stats(recipient_id, step, log_amount)
        else:
            s_n = np.zeros(len(clean_df), dtype=np.int64)
            s_24h = np.zeros(len(clean_df), dtype=np.int64)
            s_usual = np.full(len(clean_df), np.nan)
            r_n = np.zeros(len(clean_df), dtype=np.int64)
            r_usual = np.full(len(clean_df), np.nan)

        type_usual = self.artifacts.type_usual_log_amount
        if len(type_usual) != len(types_list):
            type_usual = np.array([11.92878, 12.04316, 8.14030, 9.14361, 13.38018])

        s_amt_vs_usual = log_amount - np.where(s_n > 0, s_usual, type_usual[code])
        r_amt_vs_usual = log_amount - np.where(r_n > 0, r_usual, type_usual[code])

        # Build feature table matching exact notebook Cell 6
        F_dict = {
            "log_amount": log_amount.astype(np.float32),
            "amount_vs_balance": np.log1p(np.clip(amt / (old_s + 1.0), 0, 1000)).astype(np.float32),
            "sender_balance_mismatch": signed_log(np.abs(new_s - old_s) - amt).astype(np.float32),
            "recipient_balance_mismatch": signed_log(np.abs(new_r - old_r) - amt).astype(np.float32),
            "sender_emptied": ((new_s == 0) & (old_s > 0)).astype(np.float32),
            "recipient_is_merchant": merchant.astype(np.float32),
            "sender_past_n": np.log1p(s_n).astype(np.float32),
            "sender_24h_n": np.log1p(s_24h).astype(np.float32),
            "sender_amount_vs_usual": s_amt_vs_usual.astype(np.float32),
            "recipient_past_n": np.log1p(r_n).astype(np.float32),
            "recipient_amount_vs_usual": r_amt_vs_usual.astype(np.float32),
        }
        for i, t in enumerate(types_list):
            F_dict[f"type_{t}"] = (code == i).astype(np.float32)

        F = pd.DataFrame(F_dict)
        F["recipient_empty_before"] = ((old_r == 0) & (~merchant) & (amt > 0)).astype(np.float32)

        # Scale features using loaded scaler
        features_list = self.artifacts.features
        if not features_list:
            features_list = [c for c in F.columns if c != "recipient_empty_before"]

        if self.artifacts.scaler is not None:
            raw_scaled = self.artifacts.scaler.transform(F[features_list])
            X = np.clip(raw_scaled, -10.0, 10.0).astype(np.float32)
        else:
            X = F[features_list].to_numpy(dtype=np.float32)

        return X, F, clean_df, y
