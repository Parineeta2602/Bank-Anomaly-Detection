"""
Bank Transaction Anomaly Detection Package
"""

from src.artifacts_manager import ArtifactsManager
from src.preprocessor import Preprocessor, validate_transaction_data
from src.model_scorer import ModelScorer
from src.priority_ranker import PriorityRanker, generate_explanation
from src.evaluator import Evaluator
from src.visualizer import (
    plot_metric_comparison,
    plot_precision_at_k,
    plot_confusion_matrices,
    plot_model_agreement,
    plot_score_distributions,
    plot_priority_breakdown,
    plot_score_scatter,
)

__all__ = [
    "ArtifactsManager",
    "Preprocessor",
    "validate_transaction_data",
    "ModelScorer",
    "PriorityRanker",
    "generate_explanation",
    "Evaluator",
    "plot_metric_comparison",
    "plot_precision_at_k",
    "plot_confusion_matrices",
    "plot_model_agreement",
    "plot_score_distributions",
    "plot_priority_breakdown",
    "plot_score_scatter",
]
