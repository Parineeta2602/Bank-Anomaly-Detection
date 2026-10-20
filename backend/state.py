"""
Application State Manager for Bank Transaction Anomaly Detection
Preserves single-source truth for active datasets, models, scoring results, and evaluations.
"""

import os
import sys
import numpy as np
import pandas as pd
from typing import Optional, Dict, Any, List

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.artifacts_manager import ArtifactsManager
from src.preprocessor import Preprocessor, validate_transaction_data
from src.model_scorer import ModelScorer
from src.priority_ranker import PriorityRanker, generate_explanation
from src.evaluator import Evaluator


class AppState:
    """Manages active dataset, models, and execution caches."""

    def __init__(self):
        self.artifacts_dir = os.path.join(PROJECT_ROOT, "artifacts")
        self.data_dir = os.path.join(PROJECT_ROOT, "data")
        
        # Load artifacts and initialize domain modules
        self.artifacts_mgr = ArtifactsManager(self.artifacts_dir)
        self.preprocessor = Preprocessor(self.artifacts_mgr)
        self.scorer = ModelScorer(self.artifacts_mgr)
        self.ranker = PriorityRanker(self.artifacts_mgr)
        self.evaluator = Evaluator(self.artifacts_mgr)

        # Active Dataset State
        self.dataset_name: str = "None loaded"
        self.raw_df: Optional[pd.DataFrame] = None
        self.val_report: Dict[str, Any] = {}

        # Pipeline Results State
        self.scored_df: Optional[pd.DataFrame] = None
        self.queue_df: Optional[pd.DataFrame] = None
        self.summary_stats: Dict[str, Any] = {}
        self.runtimes: Dict[str, float] = {}
        self.total_pipeline_time: float = 0.0
        self.has_scored: bool = False
        self.has_labels: bool = False
        self.y_true: Optional[np.ndarray] = None

        # Precomputed analysis caches
        self.distributions_cache: Dict[str, Any] = {}
        self.scatter_cache: List[Dict[str, Any]] = []
        self.type_breakdown_cache: List[Dict[str, Any]] = []

    def set_dataset(self, df: pd.DataFrame, name: str) -> Dict[str, Any]:
        """Sets and validates raw dataset, clearing previous scoring results."""
        self.raw_df = df
        self.dataset_name = name
        self.val_report = validate_transaction_data(df, expected_types=self.artifacts_mgr.types)
        
        # Reset scored state
        self.scored_df = None
        self.queue_df = None
        self.summary_stats = {}
        self.runtimes = {}
        self.total_pipeline_time = 0.0
        self.has_scored = False
        label_col = (
            "isFraud" if "isFraud" in df.columns
            else "isFraud_for_evaluation_only" if "isFraud_for_evaluation_only" in df.columns
            else None
        )
        self.has_labels = False
        if label_col is not None:
            labels = pd.to_numeric(df[label_col], errors="coerce")
            self.has_labels = bool(labels.notna().all() and labels.isin([0, 1]).all())
        self.y_true = None
        self.distributions_cache = {}
        self.scatter_cache = []
        self.type_breakdown_cache = []

        return self.val_report

    def run_pipeline(self) -> Dict[str, Any]:
        """Runs the exact feature transformation, model scoring, and priority ranking."""
        if self.raw_df is None or len(self.raw_df) == 0:
            raise ValueError("No active dataset loaded to analyze.")

        import time
        t0 = time.perf_counter()

        # 1. Transform features (isFraud excluded from model features)
        X, F, clean_df, y = self.preprocessor.transform(self.raw_df)
        self.y_true = y
        self.has_labels = (y is not None)

        # 2. Score with loaded models
        scoring_res = self.scorer.score(X, clean_df["amount"].to_numpy())

        # 3. Priority ranking
        scored_df, queue_df, summary_stats = self.ranker.calculate(
            F=F, clean_df=clean_df, scoring_results=scoring_res, y=y
        )
        total_time = time.perf_counter() - t0

        # Ensure explanation exists in scored_df
        if "explanation" not in scored_df.columns:
            scored_df["explanation"] = [generate_explanation(r) for r in scored_df.itertuples()]

        self.scored_df = scored_df
        self.queue_df = queue_df
        self.summary_stats = summary_stats
        self.runtimes = scoring_res["runtimes"]
        self.total_pipeline_time = total_time
        self.has_scored = True

        # Precompute visual analytics for frontend
        self._compute_analysis_caches()

        return {
            "summary_stats": self.summary_stats,
            "runtimes": self.runtimes,
            "total_pipeline_time": self.total_pipeline_time,
            "distributions": self.distributions_cache,
            "scatter_points": self.scatter_cache,
            "type_breakdown": self.type_breakdown_cache,
            "has_labels": self.has_labels,
        }

    def _compute_analysis_caches(self):
        """Precomputes compact chart data structures for instant UI rendering."""
        if self.scored_df is None:
            return

        df = self.scored_df
        has_labels = "isFraud_for_evaluation_only" in df.columns

        # 1. Distributions (Histograms for IF, SVM, Priority)
        def compute_hist(series: pd.Series, bins_n: int = 25):
            valid = series.dropna()
            if len(valid) == 0:
                return {"bins": [], "normal_counts": [], "fraud_counts": []}
            min_v, max_v = float(valid.min()), float(valid.max())
            if min_v == max_v:
                max_v += 1.0
            bin_edges = np.linspace(min_v, max_v, bins_n + 1)
            bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])

            if has_labels:
                y = df["isFraud_for_evaluation_only"].to_numpy()
                normal_series = series[y == 0].to_numpy()
                fraud_series = series[y == 1].to_numpy()
                norm_c, _ = np.histogram(normal_series, bins=bin_edges)
                fraud_c, _ = np.histogram(fraud_series, bins=bin_edges)
                return {
                    "bin_centers": [round(float(v), 4) for v in bin_centers],
                    "normal_counts": [int(v) for v in norm_c],
                    "fraud_counts": [int(v) for v in fraud_c],
                    "min": min_v,
                    "max": max_v,
                }
            else:
                total_c, _ = np.histogram(valid.to_numpy(), bins=bin_edges)
                return {
                    "bin_centers": [round(float(v), 4) for v in bin_centers],
                    "normal_counts": [int(v) for v in total_c],
                    "fraud_counts": [],
                    "min": min_v,
                    "max": max_v,
                }

        self.distributions_cache = {
            "if_score": {
                **compute_hist(df["if_score"], bins_n=30),
                "threshold": float(self.artifacts_mgr.thresholds.get("if", 0.66355)),
            },
            "svm_score": {
                **compute_hist(df["svm_score"], bins_n=30),
                "threshold": float(self.artifacts_mgr.thresholds.get("svm", 1.25120)),
            },
            "priority": {
                **compute_hist(df["priority"], bins_n=30),
                "threshold": float(self.artifacts_mgr.thresholds.get("priority", 82.68546)),
            },
        }

        # 2. Scatter Points (Sample up to 1,500 points for fluid 2D visualization)
        sample_size = min(len(df), 1500)
        # Prioritize flagged transactions in sample so outliers are always clearly visible
        flagged_df = df[df["flagged"]]
        unflagged_df = df[~df["flagged"]]
        
        n_flagged = len(flagged_df)
        if n_flagged >= sample_size:
            sample_df = flagged_df.sample(sample_size, random_state=42)
        else:
            n_unflagged_needed = sample_size - n_flagged
            sampled_unflagged = unflagged_df.sample(min(len(unflagged_df), n_unflagged_needed), random_state=42)
            sample_df = pd.concat([flagged_df, sampled_unflagged]).sample(frac=1.0, random_state=42)

        scatter_points = []
        for r in sample_df.itertuples():
            item = {
                "row_id": int(getattr(r, "row_id", 0)),
                "step": int(getattr(r, "step", 0)),
                "type": str(getattr(r, "type", "")),
                "amount": float(getattr(r, "amount", 0.0)),
                "if_score": round(float(getattr(r, "if_score", 0.0)), 4),
                "svm_score": round(float(getattr(r, "svm_score", 0.0)), 4),
                "priority": round(float(getattr(r, "priority", 0.0)), 2),
                "flagged": bool(getattr(r, "flagged", False)),
                "if_flag": bool(getattr(r, "if_flag", False)),
                "svm_flag": bool(getattr(r, "svm_flag", False)),
            }
            if has_labels:
                item["is_fraud"] = int(getattr(r, "isFraud_for_evaluation_only", 0))
            scatter_points.append(item)
        self.scatter_cache = scatter_points

        # 3. Flags by Transaction Type Breakdown
        type_group = df.groupby("type").agg(
            total=("amount", "count"),
            flagged=("flagged", "sum"),
            if_flags=("if_flag", "sum"),
            svm_flags=("svm_flag", "sum"),
            mean_amount=("amount", "mean"),
            total_amount=("amount", "sum"),
        ).reset_index()

        breakdown = []
        for _, row in type_group.iterrows():
            total = int(row["total"])
            flg = int(row["flagged"])
            breakdown.append({
                "type": str(row["type"]),
                "total": total,
                "flagged": flg,
                "if_flags": int(row["if_flags"]),
                "svm_flags": int(row["svm_flags"]),
                "flag_rate_pct": round((flg / total * 100.0) if total > 0 else 0.0, 2),
                "mean_amount": round(float(row["mean_amount"]), 2),
                "total_amount": round(float(row["total_amount"]), 2),
            })
        self.type_breakdown_cache = breakdown


# Global state instance
state = AppState()
