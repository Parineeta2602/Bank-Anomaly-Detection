# 💳 Bank Transaction Anomaly Detection Application

An enterprise anti-money laundering (AML) surveillance and transaction anomaly triage dashboard redesigned with **React** (frontend) and **FastAPI** (backend), preserving all original machine learning models (**Isolation Forest**, **One-Class SVM**), calibrated operational thresholds, and multi-criteria priority scoring.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│             React Single Page Application (SPA)             │
│   • Clean Light Theme (Navy / Slate / Subtle Blue Accents)   │
│   • Overview  • Upload & Analyze  • Queue  • Evaluation    │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Server                   │
│   • Dataset Ingestion, Validation & Schema Check            │
│   • Orchestrates Exact Feature Transformation & Inference   │
│   • Dynamic Filtering, Pagination, Sorting & CSV Export     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Reuses Core Domain Engine
┌──────────────────────────────▼──────────────────────────────┐
│                  Machine Learning Pipeline                  │
│   • Preprocessor: 16-feature transform + StandardScaler     │
│   • ModelScorer: Isolation Forest + One-Class SVM           │
│   • PriorityRanker: Empirical Percentile Ranking (0–100)    │
│   • Evaluator: Precision, Recall, F1, Precision@K, Confusion│
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Operational Workflow

```
1. Overview
   ├── Model health check (Isolation Forest, One-Class SVM, Scaler, Priority Settings)
   ├── Active dataset summary & calibrated thresholds (IF cutoff: 0.6635, SVM: 1.2512, Priority: 82.69)
   └── Precomputed PaySim test period benchmark reference (37,653 transactions, 14 frauds)

2. Upload & Analyze
   ├── Drag-and-drop CSV upload or quick-load built-in datasets (Sample 1k, Labeled 2.5k, Full Test 37.6k)
   ├── Schema validation (7 required PaySim columns, data types, missing value audit)
   ├── Run 16-feature transformation pipeline (isFraud strictly excluded from model inputs)
   ├── Dual-model scoring & operational priority score ranking
   └── Interactive score distributions, dual-model consensus space, and flags by transaction type

3. Investigation Queue
   ├── Prioritized queue sorted by Priority Score descending
   ├── Dynamic multi-criteria filters: Min Priority slider, Type pills, Consensus filter, Account ID search
   ├── CSV export for filtered investigation queue or all scored transactions
   └── Transaction-Level Inspector drawer: balance flow transitions, 4-part score attribution, audit explanation

4. Model Evaluation (Active strictly when `isFraud` ground-truth labels exist)
   ├── Detection Metric Comparison table (Baseline, IF, SVM, Combined Priority, Random guessing)
   ├── Precision@K curve vs log(K) with Random Guessing baseline
   ├── 4-panel side-by-side Confusion Matrices
   └── Model agreement & fraud concentration analysis across consensus groups
```

---

## 🚀 Running the Application Locally

### 1. Requirements
- Python 3.10+ (e.g. Anaconda Python)
- Node.js 18+ and npm

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Build / Run Frontend
```bash
# Production Build (Already built into frontend/dist, served directly by FastAPI)
cd frontend
npm install
npm run build

# Or Development Mode with Hot Reloading:
npm run dev
```

### 4. Start the Application Server
Run the FastAPI backend server (which automatically serves both the API and the React frontend on port `8000`):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open your browser at **`http://127.0.0.1:8000`**.

---

## 🧪 Running Automated Tests

Run the full pytest suite covering preprocessor validation, model scoring, priority ranking, evaluation metrics, and FastAPI REST endpoints:
```bash
python -m pytest tests/ -v
```

---

## 📁 Repository Structure

```
Bank_Anamoly_Detection/
├── artifacts/                     # Preserved trained models & calibration artifacts
│   ├── isolation_forest.joblib    # 200-tree Isolation Forest
│   ├── one_class_svm.joblib       # RBF One-Class SVM
│   ├── scaler.joblib              # StandardScaler (16 features)
│   ├── priority_settings.joblib   # Calibrated thresholds & percentile references
│   ├── metrics_table.csv          # Test benchmark table
│   └── test_predictions.csv.gz    # Test period benchmark (37,653 rows)
├── backend/                       # FastAPI application
│   ├── __init__.py
│   ├── main.py                    # REST endpoints & SPA static mounting
│   └── state.py                   # In-memory active dataset & pipeline state
├── data/                          # Sample datasets
│   ├── sample_transactions.csv    # Unlabeled sample (1,000 rows)
│   └── sample_with_labels.csv     # Labeled test sample (2,500 rows, 14 frauds)
├── frontend/                      # React + Vite application
│   ├── dist/                      # Production build bundle
│   ├── src/
│   │   ├── components/            # Header, KPI cards, charts, drawer
│   │   ├── pages/                 # Overview, Upload & Analyze, Queue, Evaluation
│   │   ├── App.jsx                # Main routing & state coordinator
│   │   ├── index.css              # Polished fintech design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── src/                           # Core Python domain logic
│   ├── __init__.py
│   ├── artifacts_manager.py       # Artifact loading & integrity validation
│   ├── preprocessor.py            # Exact feature engineering & validation
│   ├── model_scorer.py            # Isolation Forest & One-Class SVM scoring
│   ├── priority_ranker.py         # Priority score & explanation generator
│   ├── evaluator.py               # Evaluation metrics & Precision@K
│   └── visualizer.py              # Visual generation and plotting utilities
├── tests/                         # Unit & API test suite (16 tests)
│   ├── __init__.py
│   ├── test_api.py                # FastAPI integration tests
│   ├── test_preprocessor.py       # Schema validation & feature shapes
│   ├── test_models.py             # Model loading & scoring
│   ├── test_priority.py           # Priority score bounds & explanations
│   └── test_evaluation.py         # Evaluation metrics & benchmark checks
├── requirements.txt
└── README.md
```

---

## ⚖️ Critical Operational Governance Rules

1. **Zero Replacement Models:** The application strictly executes the pre-trained Isolation Forest, One-Class SVM, and StandardScaler saved in `artifacts/`. No retraining or model substitution is permitted.
2. **Strict Label Isolation:** The ground truth label `isFraud` is NEVER fed into feature transformations or model scoring. It is accessed exclusively for optional evaluation grading when present in the file.
3. **Priority Ranking $\ne$ Fraud Probability:** The Priority Score is an operational triage rank (0–100) indicating investigation priority, not a statistical probability of guilt.
