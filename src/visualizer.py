"""
Visualizer for Bank Transaction Anomaly Detection
Interactive Plotly charts styled with clean light theme and banking aesthetic.
Reproduces and enhances the exact figures from the notebook.
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Dict, Any, List, Optional


# Palette tailored for clean light theme banking app
COLORS = {
    "primary": "#1E40AF",       # Navy
    "secondary": "#0284C7",     # Sky blue
    "normal": "#4C78A8",        # Slate blue
    "fraud": "#E45756",         # Crimson
    "baseline": "#8C8C8C",      # Neutral gray
    "iforest": "#4C78A8",       # Blue
    "ocsvm": "#F58518",         # Orange
    "priority": "#54A24B",      # Emerald green
    "random": "#334155",        # Slate
    "background": "#FFFFFF",
    "grid": "#E2E8F0",
}


def apply_light_theme(fig: go.Figure) -> go.Figure:
    """Applies clean, modern light theme styling to Plotly figures."""
    fig.update_layout(
        paper_bgcolor=COLORS["background"],
        plot_bgcolor="#F8FAFC",
        font=dict(family="Inter, system-ui, sans-serif", color="#0F172A", size=12),
        margin=dict(l=40, r=40, t=50, b=40),
        legend=dict(
            bgcolor="rgba(255, 255, 255, 0.8)",
            bordercolor="#CBD5E1",
            borderwidth=1,
            font=dict(size=11),
        ),
    )
    fig.update_xaxes(showgrid=True, gridcolor=COLORS["grid"], zeroline=False)
    fig.update_yaxes(showgrid=True, gridcolor=COLORS["grid"], zeroline=False)
    return fig


def plot_metric_comparison(metrics_df: pd.DataFrame, prevalence: float) -> go.Figure:
    """Grouped bar chart comparing precision, recall, F1, average precision."""
    methods_order = [
        "Baseline: biggest amount",
        "Isolation Forest",
        "One-Class SVM",
        "Combined priority score",
    ]
    df_plot = metrics_df[metrics_df["method"].isin(methods_order)].copy()
    
    metrics = ["precision", "recall", "F1", "average_precision"]
    metric_colors = ["#1E40AF", "#F58518", "#54A24B", "#E45756"]

    fig = go.Figure()
    for m, c in zip(metrics, metric_colors):
        fig.add_trace(
            go.Bar(
                name=m.replace("_", " ").title(),
                x=df_plot["method"],
                y=df_plot[m],
                marker_color=c,
            )
        )

    fig.add_hline(
        y=prevalence,
        line_dash="dash",
        line_color="#475569",
        annotation_text=f"Random Guessing ({prevalence:.4%})",
        annotation_position="top left",
    )

    fig.update_layout(
        title="<b>Detection Metric Comparison Across Methods</b>",
        barmode="group",
        yaxis_title="Metric Value",
        height=380,
    )
    return apply_light_theme(fig)


def plot_precision_at_k(curves_dict: Dict[str, np.ndarray], n_test: int, prevalence: float) -> go.Figure:
    """Precision@K curve plotted against K on log scale."""
    fig = go.Figure()
    
    max_k = min(n_test, 50000)
    ks = np.unique(np.logspace(1, np.log10(max_k), 50).astype(int))

    method_colors = {
        "Baseline: biggest amount": COLORS["baseline"],
        "Isolation Forest": COLORS["iforest"],
        "One-Class SVM": COLORS["ocsvm"],
        "Combined priority score": COLORS["priority"],
    }

    for name, hits in curves_dict.items():
        if name in method_colors:
            valid_ks = ks[ks <= len(hits)]
            prec_k = hits[valid_ks - 1] / valid_ks
            fig.add_trace(
                go.Scatter(
                    x=valid_ks,
                    y=prec_k,
                    mode="lines",
                    name=name,
                    line=dict(color=method_colors[name], width=2.5),
                )
            )

    fig.add_hline(
        y=prevalence,
        line_dash="dash",
        line_color="#475569",
        annotation_text="Random guessing",
        annotation_position="bottom right",
    )

    fig.update_layout(
        title="<b>Precision@K (Investigating Top-Ranked K Transactions)</b>",
        xaxis_title="K = Number of Top-Ranked Transactions Read (log scale)",
        yaxis_title="Precision@K",
        xaxis_type="log",
        height=400,
    )
    return apply_light_theme(fig)


def plot_confusion_matrices(matrices_dict: Dict[str, np.ndarray]) -> go.Figure:
    """Side-by-side confusion matrices for all 4 detection approaches."""
    names = [
        "Baseline: biggest amount",
        "Isolation Forest",
        "One-Class SVM",
        "Combined priority score",
    ]
    
    fig = make_subplots(
        rows=1,
        cols=4,
        subplot_titles=[f"<b>{n}</b>" for n in names],
        shared_yaxes=True,
    )

    for i, name in enumerate(names, start=1):
        if name not in matrices_dict:
            continue
        cm = matrices_dict[name]
        # Log scale for heatmap coloring so extreme imbalance is visually discernable
        log_cm = np.log1p(cm)
        
        text_annot = [
            [f"TN:<br><b>{cm[0, 0]:,}</b>", f"FP:<br><b>{cm[0, 1]:,}</b>"],
            [f"FN:<br><b>{cm[1, 0]:,}</b>", f"TP:<br><b>{cm[1, 1]:,}</b>"],
        ]

        fig.add_trace(
            go.Heatmap(
                z=log_cm,
                x=["Flagged: No", "Flagged: Yes"],
                y=["Really Normal", "Really Fraud"],
                text=text_annot,
                texttemplate="%{text}",
                colorscale="Blues",
                showscale=False,
            ),
            row=1,
            col=i,
        )

    fig.update_layout(
        title="<b>Confusion Matrices (Log-Intensity Color Scale)</b>",
        height=320,
    )
    return apply_light_theme(fig)


def plot_model_agreement(agreement_df: pd.DataFrame, prevalence: float) -> go.Figure:
    """Bar chart illustrating model consensus groups and fraud concentration."""
    colors = [COLORS["baseline"], COLORS["iforest"], COLORS["ocsvm"], COLORS["priority"]]
    
    txns = agreement_df["transactions"].tolist()
    frauds = agreement_df["frauds"].tolist()
    rates = agreement_df["fraud_rate_%"].tolist()
    labels = agreement_df.index.tolist()

    hover_texts = [
        f"Group: <b>{lbl}</b><br>Transactions: {t:,}<br>Frauds: {f:,}<br>Fraud Rate: {r:.3f}%"
        for lbl, t, f, r in zip(labels, txns, frauds, rates)
    ]

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=labels,
            y=rates,
            text=[f"{f:,} fraud / {t:,} txns" for t, f in zip(txns, frauds)],
            textposition="auto",
            marker_color=colors,
            hovertext=hover_texts,
            hoverinfo="text",
        )
    )

    fig.add_hline(
        y=prevalence * 100.0,
        line_dash="dash",
        line_color="#475569",
        annotation_text=f"Overall Fraud Rate ({prevalence*100.0:.3f}%)",
        annotation_position="top right",
    )

    fig.update_layout(
        title="<b>Model Agreement vs. Fraud Concentration</b>",
        xaxis_title="Consensus Category",
        yaxis_title="Fraud Rate in Group (%)",
        height=360,
    )
    return apply_light_theme(fig)


def plot_score_distributions(
    scored_df: pd.DataFrame, thresholds: Dict[str, float], has_labels: bool = True
) -> go.Figure:
    """3-panel histogram showing distributions of IF score, SVM score, and Priority score."""
    fig = make_subplots(
        rows=1,
        cols=3,
        subplot_titles=[
            "<b>Isolation Forest Score</b>",
            "<b>One-Class SVM Score</b>",
            "<b>Priority Score (0-100)</b>",
        ],
    )

    items = [
        ("if_score", thresholds.get("if", 0.66355), 1),
        ("svm_score", thresholds.get("svm", 1.25120), 2),
        ("priority", thresholds.get("priority", 82.68546), 3),
    ]

    for col, thr, col_idx in items:
        vals = scored_df[col].dropna()
        if vals.empty:
            continue

        if has_labels and "isFraud_for_evaluation_only" in scored_df.columns:
            y = scored_df["isFraud_for_evaluation_only"].to_numpy()
            normal_vals = vals[y == 0]
            fraud_vals = vals[y == 1]

            fig.add_trace(
                go.Histogram(
                    x=normal_vals,
                    name="Normal",
                    marker_color=COLORS["normal"],
                    opacity=0.65,
                    showlegend=(col_idx == 1),
                ),
                row=1,
                col=col_idx,
            )
            if len(fraud_vals) > 0:
                fig.add_trace(
                    go.Histogram(
                        x=fraud_vals,
                        name="Fraud",
                        marker_color=COLORS["fraud"],
                        opacity=0.85,
                        showlegend=(col_idx == 1),
                    ),
                    row=1,
                    col=col_idx,
                )
        else:
            fig.add_trace(
                go.Histogram(
                    x=vals,
                    name="Transactions",
                    marker_color=COLORS["primary"],
                    opacity=0.7,
                    showlegend=False,
                ),
                row=1,
                col=col_idx,
            )

        # Threshold line
        fig.add_vline(
            x=thr,
            line_dash="dash",
            line_color="#0F172A",
            row=1,
            col=col_idx,
        )

    fig.update_yaxes(type="log", title_text="Count (log)")
    fig.update_layout(
        title="<b>Score Distributions with Alert Threshold Cutoffs</b>",
        barmode="overlay",
        height=350,
    )
    return apply_light_theme(fig)


def plot_priority_breakdown(row: Any) -> go.Figure:
    """Horizontal bar chart showing the 4 weighted priority score components."""
    severity = float(getattr(row, "severity", 0.0)) * 50.0
    behaviour = float(getattr(row, "behaviour", 0.0)) * 25.0
    agreement = float(getattr(row, "agreement", 0.0)) * 15.0
    urgency = float(getattr(row, "urgency", 0.0)) * 10.0
    total = float(getattr(row, "priority", severity + behaviour + agreement + urgency))

    components = ["Severity (50%)", "Behaviour (25%)", "Agreement (15%)", "Urgency (10%)"]
    points = [severity, behaviour, agreement, urgency]
    max_points = [50.0, 25.0, 15.0, 10.0]
    colors = ["#1E40AF", "#0284C7", "#F58518", "#E45756"]

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            y=components,
            x=points,
            orientation="h",
            marker_color=colors,
            text=[f"{p:.1f} / {m:.0f} pts" for p, m in zip(points, max_points)],
            textposition="auto",
        )
    )

    fig.update_layout(
        title=f"<b>Priority Score Breakdown: {total:.1f} / 100</b>",
        xaxis=dict(range=[0, 55], title="Score Contribution"),
        yaxis=dict(autorange="reversed"),
        height=240,
        margin=dict(l=20, r=20, t=40, b=20),
    )
    return apply_light_theme(fig)


def plot_score_scatter(scored_df: pd.DataFrame) -> go.Figure:
    """Interactive 2D scatter of IF score vs SVM score."""
    sample = scored_df.sample(min(len(scored_df), 3000), random_state=42)
    
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=sample["if_score"],
            y=sample["svm_score"],
            mode="markers",
            marker=dict(
                size=sample["priority"] / 10.0 + 3,
                color=sample["priority"],
                colorscale="Viridis",
                showscale=True,
                colorbar=dict(title="Priority"),
                opacity=0.7,
            ),
            text=[
                f"ID: {r.row_id}<br>Type: {r.type}<br>Amt: ${r.amount:,.2f}<br>Priority: {r.priority:.1f}"
                for r in sample.itertuples()
            ],
            hoverinfo="text",
        )
    )

    fig.update_layout(
        title="<b>Isolation Forest vs. One-Class SVM Scores</b>",
        xaxis_title="Isolation Forest Score (higher = more anomalous)",
        yaxis_title="One-Class SVM Score (higher = more anomalous)",
        height=400,
    )
    return apply_light_theme(fig)
