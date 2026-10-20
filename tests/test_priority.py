"""
Unit tests for priority ranking and explanation generation.
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
from src.priority_ranker import PriorityRanker, generate_explanation, percentile


@pytest.fixture
def artifacts_mgr():
    return ArtifactsManager()


def test_percentile():
    ref = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    x = np.array([5.0, 25.0, 50.0, 60.0])
    p = percentile(x, ref)
    assert np.allclose(p, [0.0, 0.4, 1.0, 1.0])


def test_priority_score_bounds(artifacts_mgr):
    ranker = PriorityRanker(artifacts_mgr)
    
    clean_df = pd.DataFrame({
        "row_id": [0, 1],
        "step": [1, 1],
        "type": ["TRANSFER", "PAYMENT"],
        "amount": [6000000.0, 50.0],
        "oldbalanceOrg": [6000000.0, 500.0],
        "newbalanceOrig": [0.0, 450.0],
        "oldbalanceDest": [0.0, 100.0],
        "newbalanceDest": [0.0, 150.0],
    })
    
    F = pd.DataFrame({
        "log_amount": np.array([15.6, 3.9]),
        "sender_amount_vs_usual": np.array([2.5, 0.0]),
        "recipient_amount_vs_usual": np.array([2.5, 0.0]),
        "sender_emptied": np.array([1.0, 0.0]),
        "recipient_empty_before": np.array([1.0, 0.0]),
        "recipient_is_merchant": np.array([0.0, 1.0]),
    })
    
    scoring_results = {
        "if_score": np.array([0.70, 0.40]),
        "svm_score": np.array([2.5, -1.0]),
        "if_flag": np.array([True, False]),
        "svm_flag": np.array([True, False]),
        "amount_flag": np.array([True, False]),
    }
    
    scored_df, queue, stats = ranker.calculate(F, clean_df, scoring_results)
    
    prio = scored_df["priority"].to_numpy()
    assert (prio >= 0.0).all() and (prio <= 100.0).all()
    # High-risk transfer should have much higher priority than mundane payment
    assert prio[0] > prio[1]
    assert prio[0] >= 80.0


def test_explanation_generator():
    class DummyRow:
        if_flag = True
        svm_flag = True
        type = "TRANSFER"
        amount = 6188515.0
        sender_amount_vs_usual = 2.25
        recipient_amount_vs_usual = 2.25
        recipient_is_merchant = False
        sender_emptied = True
        recipient_empty_before = True
        oldbalanceOrg = 6188515.0
        newbalanceOrig = 0.0

    exp = generate_explanation(DummyRow())
    assert "flagged by both models" in exp
    assert "TRANSFER of 6,188,515" in exp
    assert "sender account emptied" in exp
    assert "recipient account had zero balance before" in exp
