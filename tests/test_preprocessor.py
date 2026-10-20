"""
Unit tests for preprocessor and schema validation.
"""

import pytest
import pandas as pd
import numpy as np
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.artifacts_manager import ArtifactsManager
from src.preprocessor import Preprocessor, validate_transaction_data, past_stats


@pytest.fixture
def artifacts_mgr():
    return ArtifactsManager()


@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "step": [1, 1, 2, 2, 3],
        "type": ["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"],
        "amount": [100.0, 50000.0, 20000.0, 50.0, 3000.0],
        "nameOrig": ["C1001", "C1002", "C1001", "C1003", "C1004"],
        "oldbalanceOrg": [1000.0, 50000.0, 900.0, 500.0, 100.0],
        "newbalanceOrig": [900.0, 0.0, 0.0, 450.0, 3100.0],
        "nameDest": ["M2001", "C3001", "C3002", "M2002", "C3003"],
        "oldbalanceDest": [0.0, 0.0, 1000.0, 0.0, 500.0],
        "newbalanceDest": [0.0, 50000.0, 21000.0, 0.0, 3500.0],
        "isFraud": [0, 1, 0, 0, 0],
    })


def test_schema_validation_valid(sample_df):
    res = validate_transaction_data(sample_df)
    assert res["is_valid"] is True
    assert len(res["errors"]) == 0
    assert res["has_fraud_label"] is True


def test_schema_validation_missing_cols():
    bad_df = pd.DataFrame({"step": [1], "amount": [100.0]})
    res = validate_transaction_data(bad_df)
    assert res["is_valid"] is False
    assert any("Missing required columns" in e for e in res["errors"])


def test_schema_validation_invalid_type():
    bad_df = pd.DataFrame({
        "step": [1],
        "type": ["BITCOIN_BUY"],
        "amount": [100.0],
        "oldbalanceOrg": [1000.0],
        "newbalanceOrig": [900.0],
        "oldbalanceDest": [0.0],
        "newbalanceDest": [100.0],
    })
    res = validate_transaction_data(bad_df)
    assert res["is_valid"] is False
    assert any("Unsupported transaction type" in e for e in res["errors"])


def test_preprocessor_leakage_and_shape(artifacts_mgr, sample_df):
    prep = Preprocessor(artifacts_mgr)
    X, F, clean_df, y = prep.transform(sample_df)

    # 16 model features
    assert X.shape == (5, 16)
    assert F.shape[0] == 5
    assert "recipient_empty_before" in F.columns

    # Verify isFraud is NOT in feature matrix
    assert "isFraud" not in F.columns
    assert y is not None
    assert len(y) == 5
    assert y[1] == 1


def test_past_stats_causality():
    ids = np.array(["A", "A", "A"])
    steps = np.array([1, 2, 3])
    log_amt = np.array([1.0, 2.0, 3.0])
    
    n_past, n_recent, usual = past_stats(ids, steps, log_amt)
    assert n_past[0] == 0
    assert np.isnan(usual[0])
    assert n_past[1] == 1
    assert np.isclose(usual[1], 1.0)
    assert n_past[2] == 2
    assert np.isclose(usual[2], 1.5)
