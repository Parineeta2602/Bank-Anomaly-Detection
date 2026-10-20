"""
Model Scorer for Bank Transaction Anomaly Detection
Applies loaded Isolation Forest and One-Class SVM models.
Computes anomaly scores and binary flags using calibrated thresholds.
Tracks execution times.
"""

import time
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from src.artifacts_manager import ArtifactsManager


class ModelScorer:
    """Scores transactions with Isolation Forest and One-Class SVM."""

    def __init__(self, artifacts_mgr: ArtifactsManager):
        self.artifacts = artifacts_mgr

    def score(self, X: np.ndarray, amounts: np.ndarray, batch_size: int = 50000) -> Dict[str, Any]:
        """
        Calculates IF and SVM scores and evaluates threshold flags.
        
        Args:
            X: Scaled feature matrix (N, 16)
            amounts: Array of transaction amounts for baseline evaluation
            batch_size: Batch size for SVM scoring to manage memory
            
        Returns:
            Dict containing scores, flags, thresholds, and runtime seconds.
        """
        runtimes = {}
        
        # 1. Isolation Forest scoring: -score_samples(X)
        if self.artifacts.iforest is None:
            raise RuntimeError("Isolation Forest model is not loaded.")

        t0 = time.perf_counter()
        if_scores = -self.artifacts.iforest.score_samples(X)
        runtimes["if_score_seconds"] = time.perf_counter() - t0

        # 2. One-Class SVM scoring: -decision_function(X)
        if self.artifacts.ocsvm is None:
            raise RuntimeError("One-Class SVM model is not loaded.")

        t0 = time.perf_counter()
        svm_parts = []
        for i in range(0, len(X), batch_size):
            batch = X[i : i + batch_size]
            svm_parts.append(-self.artifacts.ocsvm.decision_function(batch))
        svm_scores = np.concatenate(svm_parts) if svm_parts else np.array([])
        runtimes["svm_score_seconds"] = time.perf_counter() - t0

        # 3. Apply thresholds
        if_thr = self.artifacts.thresholds.get("if", 0.66355)
        svm_thr = self.artifacts.thresholds.get("svm", 1.25120)
        amount_thr = self.artifacts.get_amount_baseline_threshold()

        if_flags = if_scores >= if_thr
        svm_flags = svm_scores >= svm_thr
        amount_flags = amounts >= amount_thr

        return {
            "if_score": if_scores,
            "svm_score": svm_scores,
            "if_flag": if_flags,
            "svm_flag": svm_flags,
            "amount_flag": amount_flags,
            "thresholds": {
                "if": if_thr,
                "svm": svm_thr,
                "amount": amount_thr,
            },
            "runtimes": runtimes,
        }
