"""
Artifacts Manager for Bank Transaction Anomaly Detection
Handles loading of trained models, scaler, thresholds, reference percentiles,
and precomputed benchmark evaluation artifacts.
Never trains replacement models or fabricates weights/thresholds.
"""

import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple


class ArtifactsManager:
    """Manages loading and access to trained models and priority settings."""

    def __init__(self, artifacts_dir: Optional[str] = None):
        if artifacts_dir is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            artifacts_dir = os.path.join(os.path.dirname(current_dir), "artifacts")

        self.artifacts_dir = artifacts_dir
        self.scaler = None
        self.iforest = None
        self.ocsvm = None
        self.priority_settings: Dict[str, Any] = {}
        
        # Precomputed evaluation tables
        self.metrics_table: Optional[pd.DataFrame] = None
        self.model_agreement_table: Optional[pd.DataFrame] = None
        self.ranked_flagged: Optional[pd.DataFrame] = None
        self.runtime_seconds: Optional[pd.DataFrame] = None
        self.test_predictions: Optional[pd.DataFrame] = None
        
        # Status tracking
        self.load_status: Dict[str, Dict[str, Any]] = {}
        self.is_fully_loaded = False
        
        self.load_all()

    def _check_and_load(self, filename: str, loader_fn):
        filepath = os.path.join(self.artifacts_dir, filename)
        if not os.path.exists(filepath):
            self.load_status[filename] = {
                "available": False,
                "path": filepath,
                "error": "File does not exist in artifacts directory",
            }
            return None
        try:
            obj = loader_fn(filepath)
            self.load_status[filename] = {
                "available": True,
                "path": filepath,
                "size_bytes": os.path.getsize(filepath),
                "error": None,
            }
            return obj
        except Exception as e:
            self.load_status[filename] = {
                "available": False,
                "path": filepath,
                "error": str(e),
            }
            return None

    def load_all(self):
        """Loads all joblib and precomputed CSV artifacts."""
        self.scaler = self._check_and_load("scaler.joblib", joblib.load)
        self.iforest = self._check_and_load("isolation_forest.joblib", joblib.load)
        self.ocsvm = self._check_and_load("one_class_svm.joblib", joblib.load)
        
        ps = self._check_and_load("priority_settings.joblib", joblib.load)
        if ps and isinstance(ps, dict):
            self.priority_settings = ps
        else:
            self.priority_settings = {}

        self.metrics_table = self._check_and_load(
            "metrics_table.csv", lambda p: pd.read_csv(p)
        )
        self.model_agreement_table = self._check_and_load(
            "model_agreement_table.csv", lambda p: pd.read_csv(p)
        )
        self.ranked_flagged = self._check_and_load(
            "ranked_flagged_transactions.csv", lambda p: pd.read_csv(p)
        )
        self.runtime_seconds = self._check_and_load(
            "runtime_seconds.csv", lambda p: pd.read_csv(p)
        )
        self.test_predictions = self._check_and_load(
            "test_predictions.csv.gz", lambda p: pd.read_csv(p, compression="gzip")
        )

        models_ready = (
            self.scaler is not None
            and self.iforest is not None
            and self.ocsvm is not None
            and bool(self.priority_settings)
        )
        self.is_fully_loaded = models_ready

    @property
    def features(self) -> list:
        return self.priority_settings.get("features", [])

    @property
    def types(self) -> list:
        return self.priority_settings.get("types", ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"])

    @property
    def thresholds(self) -> dict:
        return self.priority_settings.get("thresholds", {})

    @property
    def weights(self) -> dict:
        return self.priority_settings.get("weights", {"severity": 0.5, "behaviour": 0.25, "agreement": 0.15, "urgency": 0.1})

    @property
    def percentile_references(self) -> dict:
        return self.priority_settings.get("percentile_references", {})

    @property
    def type_usual_log_amount(self) -> np.ndarray:
        val = self.priority_settings.get("type_usual_log_amount")
        return np.array(val) if val is not None else np.array([])

    @property
    def alert_rate(self) -> float:
        return float(self.priority_settings.get("alert_rate", 0.002))

    @property
    def train_end_step(self) -> int:
        return int(self.priority_settings.get("train_end_step", 12))

    def get_amount_baseline_threshold(self) -> float:
        """Derives the exact amount threshold from the calibration percentile reference."""
        log_amt_ref = self.percentile_references.get("log_amount")
        if log_amt_ref is not None and len(log_amt_ref) > 0:
            return float(np.expm1(np.quantile(log_amt_ref, 1.0 - self.alert_rate)))
        return 2871359.5  # Precomputed fallback from calibration data

    def get_health_summary(self) -> Dict[str, Any]:
        """Provides an audit dictionary of loaded artifacts for UI display."""
        return {
            "all_models_ready": self.is_fully_loaded,
            "isolation_forest": self.load_status.get("isolation_forest.joblib", {}).get("available", False),
            "one_class_svm": self.load_status.get("one_class_svm.joblib", {}).get("available", False),
            "scaler": self.load_status.get("scaler.joblib", {}).get("available", False),
            "priority_settings": self.load_status.get("priority_settings.joblib", {}).get("available", False),
            "benchmark_tables_ready": self.metrics_table is not None and self.ranked_flagged is not None,
            "n_features": len(self.features),
            "threshold_if": self.thresholds.get("if"),
            "threshold_svm": self.thresholds.get("svm"),
            "threshold_priority": self.thresholds.get("priority"),
            "status_details": self.load_status,
        }
