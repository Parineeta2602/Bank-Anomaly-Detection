"""
Unit tests for evaluation metrics and agreement calculation.
"""

import pytest
import numpy as np
import pandas as pd
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.artifacts_manager import ArtifactsManager
from src.evaluator import Evaluator


@pytest.fixture
def artifacts_mgr():
    return ArtifactsManager()


def test_evaluator_metrics(artifacts_mgr):
    evaluator = Evaluator(artifacts_mgr)
    
    scored_df = pd.DataFrame({
        "amount": [100.0, 5000000.0, 200.0, 300.0],
        "amount_baseline_flag": [False, True, False, False],
        "if_score": [0.4, 0.7, 0.5, 0.3],
        "if_flag": [False, True, False, False],
        "svm_score": [-1.0, 2.0, -0.5, -2.0],
        "svm_flag": [False, True, False, False],
        "priority": [20.0, 95.0, 40.0, 15.0],
        "flagged": [False, True, False, False],
    })
    y = np.array([0, 1, 0, 0])
    
    res = evaluator.evaluate_dataset(scored_df, y)
    
    assert "metrics_table" in res
    assert "curves" in res
    assert "matrices" in res
    assert "agreement_table" in res
    
    metrics = res["metrics_table"].set_index("method")
    # For Combined priority score, TP should be 1, FP should be 0, Precision should be 1.0, Recall should be 1.0
    assert metrics.loc["Combined priority score", "TP"] == 1
    assert metrics.loc["Combined priority score", "FP"] == 0
    assert metrics.loc["Combined priority score", "precision"] == 1.0
    assert metrics.loc["Combined priority score", "recall"] == 1.0


def test_benchmark_results(artifacts_mgr):
    evaluator = Evaluator(artifacts_mgr)
    bench = evaluator.get_benchmark_results()
    assert bench["metrics_table"] is not None
    assert bench["n_test"] == 37653
    assert bench["n_pos"] == 14
