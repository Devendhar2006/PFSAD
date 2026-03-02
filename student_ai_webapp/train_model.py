from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from textblob import TextBlob
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "models"
MODEL_PATH = MODEL_DIR / "disengagement_model.joblib"
MODEL_PKL_PATH = MODEL_DIR / "disengagement_model.pkl"
TFIDF_PKL_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"
MULTIMODAL_DATA_PATH = DATA_DIR / "multimodal_student_data.csv"

NUMERIC_FEATURES = [
    "attendance_percent",
    "avg_grade",
    "assignments_submitted",
    "previous_failures",
]
TEXT_FEATURE = "feedback_text"
SENTIMENT_FEATURE = "feedback_sentiment_polarity"


def extract_sentiment(text_value: str) -> float:
    """Convert one text value into a sentiment polarity score in [-1, 1]."""
    clean_text = str(text_value or "").strip()
    if not clean_text:
        return 0.0
    return float(TextBlob(clean_text).sentiment.polarity)


def _find_dataset_files() -> list[Path]:
    local_data_dir = ROOT_DIR / "data"
    sibling_data_dir = ROOT_DIR.parent / "student"
    candidates = [
        local_data_dir / "student-mat.csv",
        local_data_dir / "student-por.csv",
        sibling_data_dir / "student-mat.csv",
        sibling_data_dir / "student-por.csv",
    ]
    available = [path for path in candidates if path.exists()]
    if len(available) < 2:
        raise FileNotFoundError(
            "Could not find both student CSV files. "
            "Expected in data/ or ../student/."
        )
    unique_paths = []
    for path in available:
        if path not in unique_paths:
            unique_paths.append(path)
    return unique_paths[:2]


def _synthesize_feedback(row: pd.Series) -> str:
    """Create synthetic natural-language feedback from tabular student features."""
    notes: list[str] = []
    if row["attendance_percent"] < 60:
        notes.append("I miss classes often and struggle to keep up")
    elif row["attendance_percent"] < 80:
        notes.append("I attend most classes but still miss some sessions")
    else:
        notes.append("I attend classes regularly")

    if row["avg_grade"] < 45:
        notes.append("my grades are low and I feel behind")
    elif row["avg_grade"] < 70:
        notes.append("my performance is average but unstable")
    else:
        notes.append("my grades are mostly good")

    if row["assignments_submitted"] <= 4:
        notes.append("I submit few assignments and need support")
    elif row["assignments_submitted"] <= 7:
        notes.append("I submit assignments but not always on time")
    else:
        notes.append("I submit assignments consistently")

    if row["previous_failures"] > 0:
        notes.append("I had previous failures and confidence is low")
    else:
        notes.append("I have no previous failures")

    return ". ".join(notes) + "."


def _build_features(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Build multimodal model features from source student datasets."""
    df = raw_df.copy()
    for col in ["absences", "G1", "G2", "G3", "failures", "studytime"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["higher"] = df["higher"].astype(str).str.strip('"').str.lower()

    df["attendance_percent"] = (100 - (df["absences"] * 2)).clip(0, 100)
    df["avg_grade"] = (((df["G1"] + df["G2"]) / 2) / 20 * 100).clip(0, 100)
    df["assignments_submitted"] = (
        (df["studytime"] * 2.2)
        + np.where(df["higher"] == "yes", 1.2, 0)
        - (df["absences"] / 12)
    ).round().clip(0, 10)
    df["previous_failures"] = df["failures"].clip(0, 5)

    disengagement_signal = (
        (df["G3"] < 10).astype(int)
        + (df["absences"] > 10).astype(int)
        + (df["failures"] > 0).astype(int)
    )
    df["disengaged"] = (disengagement_signal >= 2).astype(int)

    feature_df = df[NUMERIC_FEATURES + ["disengaged"]].copy()
    feature_df[TEXT_FEATURE] = feature_df.apply(_synthesize_feedback, axis=1)
    feature_df = feature_df.dropna()
    return feature_df


def _generate_feedback_text(attendance: float, failures: int, sentiment: float, avg_grade: float) -> str:
    if sentiment <= -0.25:
        negative_templates = [
            "I feel disconnected from classes and struggle to stay motivated.",
            "I miss classes often and my confidence is very low.",
            "I cannot keep up with lessons and assignments feel overwhelming.",
            "I am frustrated with school progress and feel like giving up.",
        ]
        sentence = negative_templates[int((abs(sentiment) * 100) % len(negative_templates))]
    elif sentiment >= 0.25:
        positive_templates = [
            "I enjoy classes and feel confident about my progress.",
            "I am engaged in learning and submit work on time.",
            "I attend regularly and feel positive about my studies.",
            "I stay focused in class and feel supported by teachers.",
        ]
        sentence = positive_templates[int((sentiment * 100) % len(positive_templates))]
    else:
        neutral_templates = [
            "I am managing classes but still need to improve consistency.",
            "Some weeks are good, but I sometimes lose focus.",
            "I can follow lessons, though my effort is not always steady.",
            "I am trying to improve and balance school responsibilities.",
        ]
        sentence = neutral_templates[int((abs(sentiment) * 100) % len(neutral_templates))]

    context = (
        f" Attendance is {attendance:.0f} percent, average grade is {avg_grade:.0f}, "
        f"and I have {failures} previous failures."
    )
    return sentence + context


def _generate_synthetic_dataset(n_samples: int = 300, random_state: int = 42) -> pd.DataFrame:
    """Generate realistic synthetic training data with disengagement correlations."""
    if n_samples <= 0:
        raise ValueError("n_samples must be a positive integer")

    rng = np.random.default_rng(random_state)

    attendance = np.clip(rng.normal(74, 17, n_samples), 25, 100)
    base_failure_rate = np.clip((78 - attendance) / 35, 0.05, 1.8)
    previous_failures = np.clip(rng.poisson(base_failure_rate), 0, 5)

    sentiment_latent = np.clip(
        ((attendance - 55) / 45)
        - (previous_failures * 0.22)
        + rng.normal(0, 0.3, n_samples),
        -1,
        1,
    )

    avg_grade = np.clip(
        (0.56 * attendance)
        + (22 * sentiment_latent)
        - (7.5 * previous_failures)
        + rng.normal(0, 7.5, n_samples),
        0,
        100,
    )

    assignments_submitted = np.clip(
        np.round(
            (attendance / 100 * 7.2)
            + (sentiment_latent * 1.4)
            - (previous_failures * 0.65)
            + rng.normal(0, 1.1, n_samples)
        ),
        0,
        10,
    )

    dropout_logit = (
        -3.3
        + (60 - attendance) * 0.06
        + previous_failures * 0.95
        + (55 - avg_grade) * 0.04
        - sentiment_latent * 1.7
        + (4 - assignments_submitted) * 0.22
    )
    dropout_probability = 1 / (1 + np.exp(-dropout_logit))
    disengaged = rng.binomial(1, np.clip(dropout_probability, 0.01, 0.99))

    feedback_text = [
        _generate_feedback_text(att, int(fail), float(sent), float(grade))
        for att, fail, sent, grade in zip(attendance, previous_failures, sentiment_latent, avg_grade)
    ]

    return pd.DataFrame(
        {
            "attendance_percent": np.round(attendance, 2),
            "avg_grade": np.round(avg_grade, 2),
            "assignments_submitted": np.round(assignments_submitted, 0).astype(int),
            "previous_failures": previous_failures.astype(int),
            "feedback_text": feedback_text,
            "disengaged": disengaged.astype(int),
        }
    )


def _load_or_create_multimodal_dataset() -> pd.DataFrame:
    """Load existing multimodal dataset or build/create one if unavailable."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if MULTIMODAL_DATA_PATH.exists():
        dataset = pd.read_csv(MULTIMODAL_DATA_PATH)
        required_cols = NUMERIC_FEATURES + [TEXT_FEATURE, "disengaged"]
        if all(column in dataset.columns for column in required_cols):
            dataset[TEXT_FEATURE] = dataset[TEXT_FEATURE].fillna("").astype(str)
            dataset = dataset[dataset[TEXT_FEATURE].str.strip().ne("")]
            return dataset

    try:
        data_files = _find_dataset_files()
        frames = [pd.read_csv(path, sep=";") for path in data_files]
        merged = pd.concat(frames, ignore_index=True)
        dataset = _build_features(merged)
    except FileNotFoundError:
        dataset = _generate_synthetic_dataset(n_samples=300, random_state=42)

    dataset.to_csv(MULTIMODAL_DATA_PATH, index=False)
    return dataset


def train_and_save_model() -> dict:
    """Train the disengagement model, evaluate metrics, and persist artifacts."""
    dataset = _load_or_create_multimodal_dataset()

    if dataset.empty:
        raise ValueError("Training dataset is empty after preprocessing")
    if dataset["disengaged"].nunique() < 2:
        raise ValueError("Training requires at least two target classes in 'disengaged'")

    dataset = dataset.copy()
    dataset[TEXT_FEATURE] = dataset[TEXT_FEATURE].fillna("").astype(str)
    dataset = dataset[dataset[TEXT_FEATURE].str.strip().ne("")]

    y = dataset["disengaged"]

    dataset[SENTIMENT_FEATURE] = dataset[TEXT_FEATURE].fillna("").astype(str).apply(extract_sentiment)

    x = dataset[NUMERIC_FEATURES + [SENTIMENT_FEATURE, TEXT_FEATURE]]

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    class_distribution = y_train.value_counts().to_dict()
    positive_count = int(class_distribution.get(1, 0))
    negative_count = int(class_distribution.get(0, 0))
    imbalance_ratio = (negative_count / positive_count) if positive_count else 1.0
    class_imbalance_exists = imbalance_ratio > 1.5
    scale_pos_weight = imbalance_ratio if class_imbalance_exists and positive_count else 1.0

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES + [SENTIMENT_FEATURE]),
            (
                "text",
                TfidfVectorizer(max_features=100, ngram_range=(1, 2), stop_words="english"),
                TEXT_FEATURE,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                XGBClassifier(
                    objective="binary:logistic",
                    n_estimators=250,
                    max_depth=4,
                    learning_rate=0.07,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    reg_lambda=1.0,
                    eval_metric="logloss",
                    random_state=42,
                    scale_pos_weight=scale_pos_weight,
                ),
            ),
        ]
    )

    model.fit(x_train, y_train)

    test_probs = model.predict_proba(x_test)[:, 1]
    test_preds = (test_probs >= 0.5).astype(int)

    accuracy = float(accuracy_score(y_test, test_preds))
    precision = float(precision_score(y_test, test_preds, zero_division=0))
    recall = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))

    metrics = {
        "roc_auc": float(roc_auc_score(y_test, test_probs)),
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "report": classification_report(y_test, test_preds, output_dict=True),
        "samples": int(len(dataset)),
        "positive_rate": float(y.mean()),
        "class_imbalance_exists": class_imbalance_exists,
        "imbalance_ratio": float(round(imbalance_ratio, 4)),
        "scale_pos_weight": float(round(scale_pos_weight, 4)),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    tfidf_vectorizer = model.named_steps["preprocessor"].named_transformers_["text"]

    bundle = {
        "model": model,
        "metrics": metrics,
        "features": {
            "numeric": NUMERIC_FEATURES,
            "text": TEXT_FEATURE,
            "sentiment": SENTIMENT_FEATURE,
            "target": "disengaged",
        },
    }

    joblib.dump(bundle, MODEL_PATH)
    joblib.dump(model, MODEL_PKL_PATH)
    joblib.dump(tfidf_vectorizer, TFIDF_PKL_PATH)
    return metrics


if __name__ == "__main__":
    results = train_and_save_model()
    print("Multimodal training data:", MULTIMODAL_DATA_PATH)
    print("Model trained and saved:", MODEL_PATH)
    print("Model pipeline (.pkl):", MODEL_PKL_PATH)
    print("TF-IDF vectorizer (.pkl):", TFIDF_PKL_PATH)
    print("ROC AUC:", round(results["roc_auc"], 4))
    print("Accuracy:", round(results["accuracy"], 4))
    print("Precision:", round(results["precision"], 4))
    print("Recall:", round(results["recall"], 4))
    print("F1-score:", round(results["f1_score"], 4))
    print("Class imbalance exists:", results["class_imbalance_exists"])
    print("Scale pos weight:", results["scale_pos_weight"])
    print("Samples:", results["samples"])
