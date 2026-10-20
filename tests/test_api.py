"""
Integration tests for FastAPI endpoints.
Tests status, sample dataset loading, pipeline execution, queue filtering, inspector, and evaluation.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_system_status_endpoint(client):
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["models_ready"] is True
    assert data["isolation_forest_loaded"] is True
    assert data["one_class_svm_loaded"] is True
    assert data["scaler_loaded"] is True
    assert "thresholds" in data
    assert data["thresholds"]["alert_rate"] == 0.002


def test_load_sample_and_pipeline_run(client):
    # Load the 1,000 row sample dataset
    load_resp = client.post("/api/dataset/load-sample", json={"sample_id": "sample"})
    assert load_resp.status_code == 200
    load_data = load_resp.json()
    assert load_data["success"] is True
    assert load_data["row_count"] == 1000
    assert load_data["validation"]["is_valid"] is True
    assert len(load_data["preview"]) == 10

    # Run the pipeline
    run_resp = client.post("/api/pipeline/run")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["success"] is True
    assert run_data["total_rows"] == 1000
    assert "summary_stats" in run_data
    assert "distributions" in run_data
    assert "scatter_points" in run_data
    assert "type_breakdown" in run_data

    # Check investigation queue
    queue_resp = client.get("/api/investigation/queue?min_priority=0&page=1&page_size=10")
    assert queue_resp.status_code == 200
    q_data = queue_resp.json()
    assert q_data["has_scored"] is True
    assert len(q_data["transactions"]) > 0
    first_tx = q_data["transactions"][0]
    assert "rank" in first_tx
    assert "priority" in first_tx
    assert "explanation" in first_tx

    # Check inspector endpoint for that transaction
    row_id = first_tx["row_id"]
    detail_resp = client.get(f"/api/investigation/transaction/{row_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["row_id"] == row_id
    assert "score_attribution" in detail
    assert "severity" in detail["score_attribution"]
    assert "behaviour" in detail["score_attribution"]
    assert "agreement" in detail["score_attribution"]
    assert "urgency" in detail["score_attribution"]

    # Export queue
    export_resp = client.get("/api/investigation/export?scope=queue&min_priority=50")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert len(export_resp.content) > 0


def test_labeled_dataset_and_evaluation(client):
    # Load labeled sample (2,500 rows, 14 frauds)
    load_resp = client.post("/api/dataset/load-sample", json={"sample_id": "labeled"})
    assert load_resp.status_code == 200
    assert load_resp.json()["row_count"] == 2500

    # Run pipeline
    run_resp = client.post("/api/pipeline/run")
    assert run_resp.status_code == 200
    assert run_resp.json()["has_labels"] is True

    # Test evaluation endpoint
    eval_resp = client.get("/api/evaluation")
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["has_labels"] is True
    assert eval_data["n_pos"] == 14
    assert len(eval_data["metrics_table"]) >= 4
    assert "curves" in eval_data
    assert "confusion_matrices" in eval_data
    assert "agreement_table" in eval_data


def test_benchmark_endpoint(client):
    resp = client.get("/api/evaluation/benchmark")
    assert resp.status_code == 200
    data = resp.json()
    assert data["n_test"] == 37653
    assert data["n_pos"] == 14
    assert len(data["metrics_table"]) > 0
