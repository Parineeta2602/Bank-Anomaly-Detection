"""
Unit tests for model loading and scoring.
"""

import pytest
import numpy as np
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.artifacts_manager import ArtifactsManager
from src.model_scorer import ModelScorer


@pytest.fixture
def artifacts_mgr():
    return ArtifactsManager()


def test_artifacts_loading(artifacts_mgr):
    assert artifacts_mgr.is_fully_loaded is True
    assert artifacts_mgr.iforest is not None
    assert artifacts_mgr.ocsvm is not None
    assert artifacts_mgr.scaler is not None
    assert len(artifacts_mgr.features) == 16
    assert "if" in artifacts_mgr.thresholds
    assert "svm" in artifacts_mgr.thresholds
    assert "priority" in artifacts_mgr.thresholds


def test_model_scoring_output(artifacts_mgr):
    scorer = ModelScorer(artifacts_mgr)
    
    # Create synthetic scaled input (3 rows, 16 features)
    X_dummy = np.zeros((3, 16), dtype=np.float32)
    amounts = np.array([100.0, 5000000.0, 1000.0])
    
    res = scorer.score(X_dummy, amounts)
    
    assert "if_score" in res
    assert "svm_score" in res
    assert "if_flag" in res
    assert "svm_flag" in res
    assert "amount_flag" in res
    
    assert len(res["if_score"]) == 3
    assert len(res["svm_score"]) == 3
    assert res["amount_flag"][1] is np.True_  # 5M > 2.87M
