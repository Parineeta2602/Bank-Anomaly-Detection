"""
FastAPI Server for Bank Transaction Anomaly Detection
Exposes high-performance REST APIs for dataset validation, model scoring,
prioritized triage queue, and ground-truth evaluation.
"""

import os
import io
import sys
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.state import state

app = FastAPI(
    title="Bank Transaction Anomaly Detection API",
    description="Operational API for transaction scoring, priority ranking, and audit triage.",
    version="2.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoadSampleRequest(BaseModel):
    sample_id: str  # "sample", "labeled", or "benchmark"


@app.get("/api/system/status")
def get_system_status():
    """Returns model health, active dataset information, calibrated thresholds, and config."""
    health = state.artifacts_mgr.get_health_summary()
    return {
        "models_ready": state.artifacts_mgr.is_fully_loaded,
        "isolation_forest_loaded": health["isolation_forest"],
        "one_class_svm_loaded": health["one_class_svm"],
        "scaler_loaded": health["scaler"],
        "priority_settings_loaded": health["priority_settings"],
        "thresholds": {
            "if_cutoff": float(state.artifacts_mgr.thresholds.get("if", 0.66355)),
            "svm_cutoff": float(state.artifacts_mgr.thresholds.get("svm", 1.25120)),
            "priority_cutoff": float(state.artifacts_mgr.thresholds.get("priority", 82.68546)),
            "alert_rate": float(state.artifacts_mgr.alert_rate),
        },
        "weights": state.artifacts_mgr.weights,
        "features": state.artifacts_mgr.features,
        "transaction_types": state.artifacts_mgr.types,
        "active_dataset": {
            "name": state.dataset_name,
            "row_count": len(state.raw_df) if state.raw_df is not None else 0,
            "has_labels": state.has_labels,
            "has_scored": state.has_scored,
            "flagged_count": state.summary_stats.get("flagged_by_priority", 0) if state.has_scored else 0,
        },
        "benchmark_summary": {
            "test_transactions": 37653,
            "test_frauds": 14,
            "fraud_prevalence": 14 / 37653,
        },
    }


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Uploads and validates a transaction CSV or gzip file."""
    try:
        contents = await file.read()
        filename = file.filename or "uploaded_transactions.csv"
        
        if filename.endswith(".gz"):
            df = pd.read_csv(io.BytesIO(contents), compression="gzip")
        else:
            df = pd.read_csv(io.BytesIO(contents))

        val_report = state.set_dataset(df, filename)

        # 10 rows preview
        preview_df = df.head(10).fillna("")
        preview = preview_df.to_dict(orient="records")

        return {
            "success": True,
            "dataset_name": filename,
            "row_count": len(df),
            "columns": list(df.columns),
            "validation": val_report,
            "preview": preview,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")


@app.post("/api/dataset/load-sample")
def load_sample_dataset(req: LoadSampleRequest):
    """Loads one of the verified sample datasets included with the system."""
    sample_id = req.sample_id
    if sample_id == "sample":
        path = os.path.join(state.data_dir, "sample_transactions.csv")
        name = "sample_transactions.csv (1,000 rows)"
        compression = None
    elif sample_id == "labeled":
        path = os.path.join(state.data_dir, "sample_with_labels.csv")
        name = "sample_with_labels.csv (2,500 rows, 14 frauds)"
        compression = None
    elif sample_id == "benchmark":
        path = os.path.join(state.artifacts_dir, "test_predictions.csv.gz")
        name = "test_predictions.csv.gz (37,653 rows)"
        compression = "gzip"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown sample identifier: {sample_id}")

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Sample dataset file not found at {path}")

    try:
        if compression:
            df = pd.read_csv(path, compression=compression)
        else:
            df = pd.read_csv(path)

        val_report = state.set_dataset(df, name)
        preview_df = df.head(10).fillna("")
        preview = preview_df.to_dict(orient="records")

        return {
            "success": True,
            "dataset_name": name,
            "row_count": len(df),
            "columns": list(df.columns),
            "validation": val_report,
            "preview": preview,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample dataset: {str(e)}")


@app.post("/api/pipeline/run")
def run_pipeline():
    """Executes the exact feature engineering, model scoring, and priority ranking."""
    if state.raw_df is None or len(state.raw_df) == 0:
        raise HTTPException(status_code=400, detail="No active dataset available. Please upload a file first.")

    try:
        results = state.run_pipeline()
        return {
            "success": True,
            "dataset_name": state.dataset_name,
            "total_rows": len(state.scored_df),
            "summary_stats": results["summary_stats"],
            "runtimes": results["runtimes"],
            "total_pipeline_time": results["total_pipeline_time"],
            "distributions": results["distributions"],
            "scatter_points": results["scatter_points"],
            "type_breakdown": results["type_breakdown"],
            "has_labels": results["has_labels"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution error: {str(e)}")


@app.get("/api/pipeline/results")
def get_pipeline_results():
    """Returns cached scoring analytics for current active dataset without re-running."""
    if not state.has_scored or state.scored_df is None:
        return {"has_scored": False}

    return {
        "has_scored": True,
        "dataset_name": state.dataset_name,
        "total_rows": len(state.scored_df),
        "summary_stats": state.summary_stats,
        "runtimes": state.runtimes,
        "total_pipeline_time": state.total_pipeline_time,
        "distributions": state.distributions_cache,
        "scatter_points": state.scatter_cache,
        "type_breakdown": state.type_breakdown_cache,
        "has_labels": state.has_labels,
    }


@app.get("/api/investigation/queue")
def get_investigation_queue(
    min_priority: float = Query(None, description="Minimum Priority score filter"),
    types: Optional[str] = Query(None, description="Comma-separated transaction types"),
    consensus: str = Query("all", description="all, both, if_only, svm_only, either"),
    search: Optional[str] = Query(None, description="Account name search"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=5, le=200, description="Page size"),
    sort_by: str = Query("priority", description="Column to sort by"),
    sort_dir: str = Query("desc", description="desc or asc"),
):
    """Returns prioritized investigation candidates with dynamic multi-criteria filters."""
    if not state.has_scored or state.scored_df is None:
        return {
            "has_scored": False,
            "transactions": [],
            "total_count": 0,
            "filtered_count": 0,
            "page": page,
            "page_size": page_size,
        }

    df = state.scored_df

    # Default minimum priority to calibrated cutoff if not provided
    if min_priority is None:
        min_priority = float(state.artifacts_mgr.thresholds.get("priority", 82.68546))

    # Apply filters
    filtered = df[df["priority"] >= min_priority].copy()

    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()]
        if type_list:
            filtered = filtered[filtered["type"].isin(type_list)]

    if consensus == "both":
        filtered = filtered[filtered["if_flag"] & filtered["svm_flag"]]
    elif consensus == "if_only":
        filtered = filtered[filtered["if_flag"] & ~filtered["svm_flag"]]
    elif consensus == "svm_only":
        filtered = filtered[~filtered["if_flag"] & filtered["svm_flag"]]
    elif consensus == "either":
        filtered = filtered[filtered["if_flag"] | filtered["svm_flag"]]

    if search:
        search_term = search.strip().lower()
        mask = pd.Series(False, index=filtered.index)
        if "nameOrig" in filtered.columns:
            mask = mask | filtered["nameOrig"].astype(str).str.lower().str.contains(search_term, na=False)
        if "nameDest" in filtered.columns:
            mask = mask | filtered["nameDest"].astype(str).str.lower().str.contains(search_term, na=False)
        filtered = filtered[mask]

    # Global rank by priority descending
    filtered = filtered.sort_values("priority", ascending=False).reset_index(drop=True)
    filtered["rank"] = np.arange(1, len(filtered) + 1)

    # Sort if requested on different column
    if sort_by in filtered.columns and sort_by != "priority":
        ascending = (sort_dir.lower() == "asc")
        filtered = filtered.sort_values(sort_by, ascending=ascending)

    total_filtered = len(filtered)

    # Pagination slice
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_df = filtered.iloc[start_idx:end_idx]

    cols_needed = [
        "rank", "row_id", "step", "type", "amount", "priority",
        "if_score", "svm_score", "if_flag", "svm_flag", "amount_baseline_flag",
        "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest",
        "explanation",
    ]
    if "nameOrig" in page_df.columns:
        cols_needed.append("nameOrig")
    if "nameDest" in page_df.columns:
        cols_needed.append("nameDest")
    if "isFraud_for_evaluation_only" in page_df.columns:
        cols_needed.append("isFraud_for_evaluation_only")

    # Serialize safely
    records = []
    for r in page_df.itertuples():
        item = {
            "rank": int(getattr(r, "rank", 0)),
            "row_id": int(getattr(r, "row_id", 0)),
            "step": int(getattr(r, "step", 0)),
            "type": str(getattr(r, "type", "")),
            "amount": float(getattr(r, "amount", 0.0)),
            "priority": round(float(getattr(r, "priority", 0.0)), 2),
            "if_score": round(float(getattr(r, "if_score", 0.0)), 4),
            "svm_score": round(float(getattr(r, "svm_score", 0.0)), 4),
            "if_flag": bool(getattr(r, "if_flag", False)),
            "svm_flag": bool(getattr(r, "svm_flag", False)),
            "amount_baseline_flag": bool(getattr(r, "amount_baseline_flag", False)),
            "nameOrig": str(getattr(r, "nameOrig", "N/A")),
            "nameDest": str(getattr(r, "nameDest", "N/A")),
            "oldbalanceOrg": float(getattr(r, "oldbalanceOrg", 0.0)),
            "newbalanceOrig": float(getattr(r, "newbalanceOrig", 0.0)),
            "oldbalanceDest": float(getattr(r, "oldbalanceDest", 0.0)),
            "newbalanceDest": float(getattr(r, "newbalanceDest", 0.0)),
            "explanation": str(getattr(r, "explanation", "")),
        }
        if "isFraud_for_evaluation_only" in page_df.columns:
            item["isFraud"] = int(getattr(r, "isFraud_for_evaluation_only", 0))
        records.append(item)

    return {
        "has_scored": True,
        "transactions": records,
        "total_count": len(df),
        "filtered_count": total_filtered,
        "page": page,
        "page_size": page_size,
        "min_priority": min_priority,
        "calibrated_threshold": float(state.artifacts_mgr.thresholds.get("priority", 82.68546)),
    }


@app.get("/api/investigation/transaction/{row_id}")
def get_transaction_detail(row_id: int):
    """Provides deep-dive transaction inspection including 4-component score attribution."""
    if not state.has_scored or state.scored_df is None:
        raise HTTPException(status_code=400, detail="No scored transactions available.")

    matches = state.scored_df[state.scored_df["row_id"] == row_id]
    if matches.empty:
        raise HTTPException(status_code=404, detail=f"Transaction with row_id {row_id} not found.")

    row = matches.iloc[0]

    # Calculate exact 4-part score points
    severity_pts = round(float(getattr(row, "severity", 0.0)) * 50.0, 2)
    behaviour_pts = round(float(getattr(row, "behaviour", 0.0)) * 25.0, 2)
    agreement_pts = round(float(getattr(row, "agreement", 0.0)) * 15.0, 2)
    urgency_pts = round(float(getattr(row, "urgency", 0.0)) * 10.0, 2)
    total_priority = round(float(getattr(row, "priority", severity_pts + behaviour_pts + agreement_pts + urgency_pts)), 2)

    has_labels = "isFraud_for_evaluation_only" in matches.columns

    return {
        "row_id": int(row["row_id"]),
        "step": int(row["step"]),
        "type": str(row["type"]),
        "amount": float(row["amount"]),
        "nameOrig": str(row.get("nameOrig", "N/A")),
        "nameDest": str(row.get("nameDest", "N/A")),
        "oldbalanceOrg": float(row["oldbalanceOrg"]),
        "newbalanceOrig": float(row["newbalanceOrig"]),
        "oldbalanceDest": float(row["oldbalanceDest"]),
        "newbalanceDest": float(row["newbalanceDest"]),
        "sender_balance_delta": float(row["newbalanceOrig"] - row["oldbalanceOrg"]),
        "recipient_balance_delta": float(row["newbalanceDest"] - row["oldbalanceDest"]),
        "balance_mismatch": float(abs(row["newbalanceOrig"] - row["oldbalanceOrg"]) - row["amount"]),
        "if_score": round(float(row["if_score"]), 4),
        "svm_score": round(float(row["svm_score"]), 4),
        "if_flag": bool(row["if_flag"]),
        "svm_flag": bool(row["svm_flag"]),
        "amount_baseline_flag": bool(row.get("amount_baseline_flag", False)),
        "flagged": bool(row["flagged"]),
        "priority": total_priority,
        "score_attribution": {
            "severity": {"points": severity_pts, "max": 50.0, "percentage": 50},
            "behaviour": {"points": behaviour_pts, "max": 25.0, "percentage": 25},
            "agreement": {"points": agreement_pts, "max": 15.0, "percentage": 15},
            "urgency": {"points": urgency_pts, "max": 10.0, "percentage": 10},
            "total_priority": total_priority,
        },
        "behavioral_indicators": {
            "sender_emptied": bool(row.get("sender_emptied", False)),
            "recipient_empty_before": bool(row.get("recipient_empty_before", False)),
            "recipient_is_merchant": bool(row.get("recipient_is_merchant", False)),
            "sender_amount_ratio": round(float(np.exp(row.get("sender_amount_vs_usual", 0.0))), 2),
            "recipient_amount_ratio": round(float(np.exp(row.get("recipient_amount_vs_usual", 0.0))), 2),
        },
        "explanation": str(row.get("explanation", "")),
        "isFraud": int(row["isFraud_for_evaluation_only"]) if has_labels else None,
    }


@app.get("/api/investigation/export")
def export_transactions(
    scope: str = Query("queue", description="'queue' (filtered) or 'all'"),
    min_priority: float = Query(None),
    types: Optional[str] = Query(None),
    consensus: str = Query("all"),
    search: Optional[str] = Query(None),
):
    """Exports either the filtered investigation queue or all scored transactions to CSV."""
    if not state.has_scored or state.scored_df is None:
        raise HTTPException(status_code=400, detail="No scored transactions to export.")

    df = state.scored_df

    if scope == "queue":
        if min_priority is None:
            min_priority = float(state.artifacts_mgr.thresholds.get("priority", 82.68546))
        filtered = df[df["priority"] >= min_priority].copy()

        if types:
            type_list = [t.strip() for t in types.split(",") if t.strip()]
            if type_list:
                filtered = filtered[filtered["type"].isin(type_list)]

        if consensus == "both":
            filtered = filtered[filtered["if_flag"] & filtered["svm_flag"]]
        elif consensus == "if_only":
            filtered = filtered[filtered["if_flag"] & ~filtered["svm_flag"]]
        elif consensus == "svm_only":
            filtered = filtered[~filtered["if_flag"] & filtered["svm_flag"]]
        elif consensus == "either":
            filtered = filtered[filtered["if_flag"] | filtered["svm_flag"]]

        if search:
            search_term = search.strip().lower()
            mask = pd.Series(False, index=filtered.index)
            if "nameOrig" in filtered.columns:
                mask = mask | filtered["nameOrig"].astype(str).str.lower().str.contains(search_term, na=False)
            if "nameDest" in filtered.columns:
                mask = mask | filtered["nameDest"].astype(str).str.lower().str.contains(search_term, na=False)
            filtered = filtered[mask]

        export_df = filtered.sort_values("priority", ascending=False)
        filename = "investigation_queue.csv"
    else:
        export_df = df
        filename = "all_scored_transactions.csv"

    stream = io.StringIO()
    export_df.to_csv(stream, index=False)
    csv_bytes = stream.getvalue().encode("utf-8")

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/evaluation")
def get_evaluation():
    """
    Computes and returns model evaluation against ground-truth labels.
    Active ONLY when isFraud ground-truth labels are present in the active dataset.
    """
    if not state.has_scored or state.scored_df is None:
        return {
            "has_scored": False,
            "has_labels": False,
            "message": "No active scored transactions. Please upload a dataset and run the pipeline first.",
        }

    df = state.scored_df
    label_col = (
        "isFraud_for_evaluation_only"
        if "isFraud_for_evaluation_only" in df.columns
        else "isFraud" if "isFraud" in df.columns
        else None
    )
    if not state.has_labels or label_col is None:
        return {
            "has_scored": True,
            "has_labels": False,
            "message": "Ground-truth fraud labels ('isFraud' or 'isFraud_for_evaluation_only') are not present in the currently loaded dataset. Evaluation requires verified fraud labels.",
        }

    labels = pd.to_numeric(df[label_col], errors="coerce")
    if labels.isna().any() or not labels.isin([0, 1]).all():
        return {
            "has_scored": True,
            "has_labels": False,
            "message": f"Ground-truth column '{label_col}' contains missing or non-binary values. Evaluation was stopped to avoid misleading metrics.",
        }

    y = labels.to_numpy(dtype=np.int8)
    n_pos = int(y.sum())
    n_total = len(y)

    if n_pos == 0:
        return {
            "has_scored": True,
            "has_labels": True,
            "n_pos": 0,
            "message": "The dataset contains an 'isFraud' column, but has 0 positive fraud cases. Evaluation requires at least one fraud instance.",
        }

    # Execute dynamic evaluation suite
    eval_res = state.evaluator.evaluate_dataset(df, y, runtimes=state.runtimes)
    metrics_df = eval_res["metrics_table"].fillna(np.nan)

    # 1. Metrics comparison table
    metrics_records = []
    for r in metrics_df.itertuples():
        metrics_records.append({
            "method": str(getattr(r, "method", "")),
            "flagged": int(getattr(r, "flagged", 0)) if pd.notna(getattr(r, "flagged", 0)) else None,
            "TP": int(getattr(r, "TP", 0)) if pd.notna(getattr(r, "TP", np.nan)) else None,
            "FP": int(getattr(r, "FP", 0)) if pd.notna(getattr(r, "FP", np.nan)) else None,
            "FN": int(getattr(r, "FN", 0)) if pd.notna(getattr(r, "FN", np.nan)) else None,
            "TN": int(getattr(r, "TN", 0)) if pd.notna(getattr(r, "TN", np.nan)) else None,
            "precision": round(float(getattr(r, "precision", 0.0)), 4) if pd.notna(getattr(r, "precision", np.nan)) else None,
            "recall": round(float(getattr(r, "recall", 0.0)), 4) if pd.notna(getattr(r, "recall", np.nan)) else None,
            "F1": round(float(getattr(r, "F1", 0.0)), 4) if pd.notna(getattr(r, "F1", np.nan)) else None,
            "false_positive_rate": round(float(getattr(r, "false_positive_rate", 0.0)), 4) if pd.notna(getattr(r, "false_positive_rate", np.nan)) else None,
            "average_precision": round(float(getattr(r, "average_precision", 0.0)), 4) if pd.notna(getattr(r, "average_precision", np.nan)) else None,
            "seconds": round(float(getattr(r, "seconds", 0.0)), 3) if pd.notna(getattr(r, "seconds", np.nan)) else None,
        })

    # 2. Precision@K breakdown table
    k_cols = [c for c in metrics_df.columns if "@" in c]
    k_table = []
    for r in metrics_df.itertuples():
        row_dict = {"method": str(getattr(r, "method", ""))}
        for k_col in k_cols:
            val = getattr(r, k_col, np.nan)
            row_dict[k_col] = round(float(val), 4) if pd.notna(val) else None
        k_table.append(row_dict)

    # 3. Precision@K Curves for chart
    max_k = min(n_total, 50000)
    ks = np.unique(np.logspace(1, np.log10(max_k), 40).astype(int)).tolist()
    curve_series = {}
    for name, hits in eval_res["curves"].items():
        points = []
        for k in ks:
            if k <= len(hits):
                prec = hits[k - 1] / k
                rec = hits[k - 1] / max(n_pos, 1)
                points.append({"k": int(k), "precision": round(float(prec), 4), "recall": round(float(rec), 4)})
        curve_series[name] = points

    # 4. Confusion matrices
    formatted_matrices = {}
    for name, cm in eval_res["matrices"].items():
        formatted_matrices[name] = {
            "TN": int(cm[0, 0]),
            "FP": int(cm[0, 1]),
            "FN": int(cm[1, 0]),
            "TP": int(cm[1, 1]),
        }

    # 5. Model agreement table
    agr_df = eval_res["agreement_table"].reset_index()
    agreement_records = []
    for _, r in agr_df.iterrows():
        agreement_records.append({
            "group": str(r["group"]),
            "transactions": int(r["transactions"]),
            "frauds": int(r["frauds"]),
            "fraud_rate_pct": float(r["fraud_rate_%"]),
        })

    return {
        "has_scored": True,
        "has_labels": True,
        "n_total": n_total,
        "n_pos": n_pos,
        "prevalence": round(float(eval_res["prevalence"]), 6),
        "prevalence_pct": round(float(eval_res["prevalence"] * 100.0), 4),
        "metrics_table": metrics_records,
        "precision_at_k_table": k_table,
        "curves": curve_series,
        "confusion_matrices": formatted_matrices,
        "agreement_table": agreement_records,
    }




@app.get("/api/evaluation/benchmark")
def get_benchmark():
    """Return benchmark metrics, including Precision@K and Recall@K."""
    bench = state.evaluator.get_benchmark_results()

    # Standard benchmark metrics
    metrics_records = []
    metrics_df = bench.get("metrics_table")

    if metrics_df is not None:
        metrics_df = metrics_df.replace([np.inf, -np.inf], np.nan)

        for _, r in metrics_df.iterrows():
            metrics_records.append({
                "method": str(r.get("method", "")),
                "flagged": int(r["flagged"]) if pd.notna(r.get("flagged")) else None,
                "TP": int(r["TP"]) if pd.notna(r.get("TP")) else None,
                "FP": int(r["FP"]) if pd.notna(r.get("FP")) else None,
                "FN": int(r["FN"]) if pd.notna(r.get("FN")) else None,
                "TN": int(r["TN"]) if pd.notna(r.get("TN")) else None,
                "precision": round(float(r["precision"]), 4) if pd.notna(r.get("precision")) else None,
                "recall": round(float(r["recall"]), 4) if pd.notna(r.get("recall")) else None,
                "F1": round(float(r["F1"]), 4) if pd.notna(r.get("F1")) else None,
                "false_positive_rate": round(float(r["false_positive_rate"]), 4)
                    if pd.notna(r.get("false_positive_rate")) else None,
                "average_precision": round(float(r["average_precision"]), 4)
                    if pd.notna(r.get("average_precision")) else None,
            })

    # Precision@K and Recall@K: use the separately calculated table
    k_records = []
    k_df = bench.get("precision_at_k_table")

    if k_df is not None:
        if not isinstance(k_df, pd.DataFrame):
            k_df = pd.DataFrame(k_df)

        k_df = k_df.replace([np.inf, -np.inf], np.nan)

        for _, r in k_df.iterrows():
            k_row = {"method": str(r.get("method", ""))}

            for col in k_df.columns:
                if "@" in str(col):
                    value = r[col]
                    k_row[col] = round(float(value), 4) if pd.notna(value) else None

            k_records.append(k_row)

    # Model agreement metrics
    agr_records = []
    agr_df = bench.get("agreement_table")

    if agr_df is not None:
        agr_df = agr_df.reset_index()

        for _, r in agr_df.iterrows():
            agr_records.append({
                "group": str(r.get("group", "")),
                "transactions": int(r.get("transactions", 0)),
                "frauds": int(r.get("frauds", 0)),
                "fraud_rate_pct": float(r.get("fraud_rate_%", 0.0)),
            })

    return {
        "n_test": bench["n_test"],
        "n_pos": bench["n_pos"],
        "prevalence": bench["prevalence"],
        "metrics_table": metrics_records,
        "precision_at_k_table": k_records,
        "agreement_table": agr_records,
    }


# Mount built frontend static files if dist directory exists
frontend_dist = os.path.join(PROJECT_ROOT, "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index_file = os.path.join(frontend_dist, "index.html")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(index_file)
