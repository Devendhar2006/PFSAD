from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap
import streamlit as st
import __main__
from textblob import TextBlob


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "disengagement_model.joblib"
MODEL_PKL_PATH = ROOT_DIR / "models" / "disengagement_model.pkl"

NUMERIC_FIELDS = [
    "attendance_percent",
    "avg_grade",
    "assignments_submitted",
    "previous_failures",
]
TEXT_FIELD = "feedback_text"
NAME_FIELD = "student_name"
SENTIMENT_FEATURE = "feedback_sentiment_polarity"


def apply_custom_theme() -> None:
    st.markdown(
        """
        <style>
            .stApp {
                background: linear-gradient(125deg, #f6fbff 0%, #eef8f3 40%, #f7fbff 100%);
            }
            .main .block-container {
                padding-top: 1.5rem;
                max-width: 1150px;
            }
            .hero-box {
                background: linear-gradient(135deg, #0f172a 0%, #124a44 55%, #1f7a8c 100%);
                border-radius: 18px;
                padding: 1.5rem 1.6rem;
                color: #ffffff;
                box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22);
                margin-bottom: 1rem;
            }
            .hero-title {
                font-size: 1.55rem;
                font-weight: 700;
                margin-bottom: 0.3rem;
            }
            .hero-subtitle {
                font-size: 0.98rem;
                opacity: 0.92;
                margin-bottom: 0;
            }
            .section-card {
                background: rgba(255, 255, 255, 0.88);
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 14px;
                padding: 1rem 1rem 0.4rem 1rem;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
            }
            .risk-chip {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.8rem;
                border-radius: 999px;
                font-weight: 700;
                font-size: 0.95rem;
                border: 1px solid rgba(148, 163, 184, 0.35);
                background: #ffffff;
            }
            .risk-dot {
                width: 0.65rem;
                height: 0.65rem;
                border-radius: 50%;
                display: inline-block;
            }
            .small-note {
                color: #475569;
                font-size: 0.88rem;
                margin-top: 0.2rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _register_pickle_compat_symbols() -> None:
    """Expose legacy callable names for models serialized from script execution."""
    try:
        from train_model import extract_sentiment

        setattr(__main__, "extract_sentiment", extract_sentiment)
    except Exception:
        pass


@st.cache_resource
def load_model_bundle() -> dict:
    """Load the serialized model pipeline and optional metadata bundle."""
    _register_pickle_compat_symbols()

    if not MODEL_PATH.exists() and not MODEL_PKL_PATH.exists():
        raise FileNotFoundError(
            "Model file not found. Run `python train_model.py` first to generate model artifacts."
        )
    if MODEL_PKL_PATH.exists():
        model = joblib.load(MODEL_PKL_PATH)
        metadata = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else {}
        return {
            "model": model,
            "metrics": metadata.get("metrics", {}),
            "features": metadata.get("features", {}),
        }
    return joblib.load(MODEL_PATH)


@st.cache_resource
def load_shap_explainer(_model_pipeline):
    """Build and cache a SHAP explainer for the tree-based classifier."""
    classifier = _model_pipeline.named_steps["classifier"]
    return shap.TreeExplainer(classifier)


def risk_category(probability: float) -> str:
    if probability < 0.33:
        return "Low"
    if probability < 0.66:
        return "Medium"
    return "High"


def risk_color(category: str) -> str:
    if category == "Low":
        return "green"
    if category == "Medium":
        return "orange"
    return "red"


def format_feature_name(raw_name: str) -> str:
    if raw_name.startswith("num__"):
        return raw_name.replace("num__", "")
    if raw_name.startswith("sentiment__"):
        return "feedback_sentiment_polarity"
    if raw_name.startswith("text__"):
        return f"feedback:{raw_name.replace('text__', '')}"
    return raw_name


def top_contributing_features(model_pipeline, input_df: pd.DataFrame, top_n: int = 5) -> list[dict]:
    """Return top-N SHAP feature contributions for a single prediction record."""
    preprocessor = model_pipeline.named_steps["preprocessor"]
    transformed = preprocessor.transform(input_df)
    transformed_dense = transformed.toarray() if hasattr(transformed, "toarray") else np.asarray(transformed)
    feature_names = preprocessor.get_feature_names_out()

    try:
        explainer = load_shap_explainer(model_pipeline)

        # Use modern SHAP call pattern for forward compatibility.
        shap_output = explainer(transformed_dense)
        shap_values = getattr(shap_output, "values", shap_output)

        if isinstance(shap_values, list):
            shap_array = np.asarray(shap_values[1]) if len(shap_values) > 1 else np.asarray(shap_values[0])
        else:
            shap_array = np.asarray(shap_values)
        contribution_scores = shap_array[0]
    except Exception:
        # Fallback approximation if SHAP fails in constrained runtimes.
        classifier = model_pipeline.named_steps["classifier"]
        importances = getattr(classifier, "feature_importances_", np.zeros(len(feature_names)))
        contribution_scores = transformed_dense[0] * importances

    top_indices = np.argsort(np.abs(contribution_scores))[::-1][:top_n]

    features = []
    for idx in top_indices:
        score = float(contribution_scores[idx])
        features.append(
            {
                "feature": format_feature_name(feature_names[idx]),
                "contribution": score,
                "impact": "increases_risk" if score > 0 else "reduces_risk",
            }
        )
    return features


def summarize_explanation(contributions: list[dict]) -> str:
    """Create a plain-language explanation from top feature contributions."""
    readable = {
        "attendance_percent": "lower attendance",
        "avg_grade": "lower average grade",
        "assignments_submitted": "fewer assignments submitted",
        "previous_failures": "previous failures",
        "feedback_sentiment_polarity": "negative feedback sentiment",
    }

    increasing = [item for item in contributions if item["impact"] == "increases_risk"]
    if not increasing:
        return "Your strongest factors currently reduce disengagement risk."

    top_factors = []
    for item in increasing[:2]:
        raw = item["feature"]
        if raw.startswith("feedback:"):
            top_factors.append("phrases in your written feedback")
        else:
            top_factors.append(readable.get(raw, raw.replace("_", " ")))

    if len(top_factors) == 1:
        return f"The model found that {top_factors[0]} contributed most to higher risk."
    return f"The model found that {top_factors[0]} and {top_factors[1]} contributed most to higher risk."


def motivational_tip(category: str) -> str:
    if category == "Low":
        return "Great momentum. Keep attendance and assignment consistency strong."
    if category == "Medium":
        return "You are close to low risk. Improving weekly attendance and assignment completion can help quickly."
    return "You can turn this around. Start with small steps this week: attend every class and submit at least one pending assignment."


def build_input_frame(
    attendance_percent: float,
    avg_grade: float,
    assignments_submitted: float,
    previous_failures: float,
    feedback_text: str,
) -> pd.DataFrame:
    clean_feedback = str(feedback_text).strip()
    sentiment_score = 0.0 if not clean_feedback else float(TextBlob(clean_feedback).sentiment.polarity)

    return pd.DataFrame(
        [
            {
                "attendance_percent": float(attendance_percent),
                "avg_grade": float(avg_grade),
                "assignments_submitted": float(assignments_submitted),
                "previous_failures": float(previous_failures),
                SENTIMENT_FEATURE: sentiment_score,
                "feedback_text": clean_feedback,
            }
        ]
    )


def _validate_single_input(payload: dict[str, Any]) -> tuple[bool, str | None]:
    """Validate and sanitize a single prediction payload."""
    student_name = str(payload.get(NAME_FIELD, "")).strip()
    if not student_name:
        return False, "student_name is required"

    checks = {
        "attendance_percent": (0, 100),
        "avg_grade": (0, 100),
        "assignments_submitted": (0, 10),
        "previous_failures": (0, 5),
    }

    for field, (low, high) in checks.items():
        value = payload.get(field)
        if value is None:
            return False, f"{field} is required"
        if not isinstance(value, (int, float, np.integer, np.floating)):
            return False, f"{field} must be numeric"
        if np.isnan(float(value)) or float(value) < low or float(value) > high:
            return False, f"{field} must be between {low} and {high}"

    feedback = str(payload.get(TEXT_FIELD, "")).strip()
    if not feedback or feedback.lower() == "nan":
        return False, "feedback_text must be non-empty"

    return True, None


def validate_batch_dataframe(dataframe: pd.DataFrame) -> tuple[bool, str | None]:
    """Validate uploaded batch data before model inference."""
    required_columns = [NAME_FIELD] + NUMERIC_FIELDS + [TEXT_FIELD]
    missing = [column for column in required_columns if column not in dataframe.columns]
    if missing:
        return False, f"Missing required columns: {', '.join(missing)}"

    if dataframe[NAME_FIELD].astype(str).str.strip().eq("").any():
        return False, "student_name must be non-empty for all rows"

    checks = {
        "attendance_percent": (0, 100),
        "avg_grade": (0, 100),
        "assignments_submitted": (0, 10),
        "previous_failures": (0, 5),
    }

    for field, (low, high) in checks.items():
        numeric_col = pd.to_numeric(dataframe[field], errors="coerce")
        invalid_mask = numeric_col.isna() | (numeric_col < low) | (numeric_col > high)
        if invalid_mask.any():
            row_num = int(dataframe.index[invalid_mask][0]) + 1
            return False, f"Invalid value in '{field}' at CSV row {row_num}. Expected {low} to {high}."

    feedback_series = dataframe[TEXT_FIELD].astype(str).str.strip()
    empty_feedback = feedback_series.eq("") | feedback_series.str.lower().eq("nan") | feedback_series.str.lower().eq("none")
    if empty_feedback.any():
        row_num = int(dataframe.index[empty_feedback][0]) + 1
        return False, f"Empty feedback_text at CSV row {row_num}."

    return True, None


def render_single_prediction(model_pipeline) -> None:
    """Render the student-facing personal risk workflow."""
    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Student Check-In")
    st.caption("Track your engagement level and get simple, supportive guidance.")

    with st.form("single_prediction_form", clear_on_submit=False):
        student_name = st.text_input("Your Name", value="")

        col1, col2 = st.columns(2)
        with col1:
            attendance_percent = st.slider("Attendance Percent", min_value=0.0, max_value=100.0, value=75.0, step=1.0)
            avg_grade = st.slider("Average Grade", min_value=0.0, max_value=100.0, value=65.0, step=1.0)
        with col2:
            assignments_submitted = st.slider("Assignments Submitted", min_value=0.0, max_value=10.0, value=6.0, step=1.0)
            previous_failures = st.slider("Previous Failures", min_value=0.0, max_value=5.0, value=1.0, step=1.0)

        feedback_text = st.text_area(
            "Student Feedback",
            value="I struggle to keep up with assignments and miss some classes.",
            height=120,
            placeholder="Write how the student feels about attendance, classes, and assignments...",
        )
        submitted = st.form_submit_button("Predict Risk", type="primary", use_container_width=True)

    if submitted:
        payload = {
            NAME_FIELD: student_name,
            "attendance_percent": attendance_percent,
            "avg_grade": avg_grade,
            "assignments_submitted": assignments_submitted,
            "previous_failures": previous_failures,
            "feedback_text": feedback_text,
        }

        valid, validation_error = _validate_single_input(payload)
        if not valid:
            st.error(validation_error)
            return

        input_df = build_input_frame(
            payload["attendance_percent"],
            payload["avg_grade"],
            payload["assignments_submitted"],
            payload["previous_failures"],
            str(payload["feedback_text"]).strip(),
        )

        risk_score = float(model_pipeline.predict_proba(input_df)[0, 1])
        category = risk_category(risk_score)
        contributions = top_contributing_features(model_pipeline, input_df, top_n=5)
        explanation = summarize_explanation(contributions)

        metrics_col1, metrics_col2 = st.columns([1, 1])
        with metrics_col1:
            st.metric("Risk Score", f"{risk_score:.2f}")
            st.progress(min(max(risk_score, 0.0), 1.0), text=f"{risk_score * 100:.1f}% disengagement probability")
            st.markdown("<p class='small-note'>This is a probability score from 0 to 1.</p>", unsafe_allow_html=True)
        with metrics_col2:
            indicator_color = risk_color(category)
            st.markdown(
                (
                    "<div style='padding: 0.2rem 0;'>"
                    "<div style='font-size: 0.9rem; color: #334155; margin-bottom: 0.35rem;'>Risk Category</div>"
                    f"<div class='risk-chip'><span class='risk-dot' style='background:{indicator_color};'></span>{category}</div>"
                    "</div>"
                ),
                unsafe_allow_html=True,
            )

        st.markdown(f"### Hello {student_name}, here is your result")
        st.info(explanation)
        st.success(motivational_tip(category))

        contribution_df = pd.DataFrame(contributions)
        contribution_df["abs_contribution"] = contribution_df["contribution"].abs()
        st.markdown("#### What influenced this prediction")
        st.bar_chart(contribution_df[["feature", "abs_contribution"]].set_index("feature"), use_container_width=True)
        st.dataframe(contribution_df[["feature", "contribution", "impact"]], use_container_width=True)

    st.markdown("</div>", unsafe_allow_html=True)


def _sample_student_table() -> pd.DataFrame:
    """Return a preview-ready student table from local dataset or defaults."""
    dataset_path = ROOT_DIR / "data" / "multimodal_student_data.csv"
    if dataset_path.exists():
        data = pd.read_csv(dataset_path).copy()
        required = NUMERIC_FIELDS + [TEXT_FIELD]
        available = [column for column in required if column in data.columns]
        table = data[available].head(30).copy()
    else:
        table = pd.DataFrame(
            [
                {
                    "attendance_percent": 84,
                    "avg_grade": 76,
                    "assignments_submitted": 8,
                    "previous_failures": 0,
                    "feedback_text": "I feel positive and keep up with coursework.",
                },
                {
                    "attendance_percent": 58,
                    "avg_grade": 49,
                    "assignments_submitted": 4,
                    "previous_failures": 2,
                    "feedback_text": "I miss classes and struggle to complete assignments.",
                },
            ]
        )

    if NAME_FIELD not in table.columns:
        table.insert(0, NAME_FIELD, [f"Student_{idx+1:02d}" for idx in range(len(table))])

    ordered_cols = [NAME_FIELD] + [col for col in NUMERIC_FIELDS + [TEXT_FIELD] if col in table.columns]
    return table[ordered_cols]


def _predict_batch(model_pipeline, dataframe: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Run predictions and gather per-row SHAP contribution summaries."""
    rows = []
    importance_rows = []

    for index, row in dataframe.iterrows():
        input_df = build_input_frame(
            row["attendance_percent"],
            row["avg_grade"],
            row["assignments_submitted"],
            row["previous_failures"],
            row["feedback_text"],
        )
        score = float(model_pipeline.predict_proba(input_df)[0, 1])
        category = risk_category(score)
        contributions = top_contributing_features(model_pipeline, input_df, top_n=5)
        explanation = summarize_explanation(contributions)

        for item in contributions:
            importance_rows.append(
                {
                    "student_name": str(row[NAME_FIELD]),
                    "feature": item["feature"],
                    "contribution": item["contribution"],
                    "abs_contribution": abs(item["contribution"]),
                }
            )

        rows.append(
            {
                "row_number": int(index + 1),
                "student_name": str(row[NAME_FIELD]),
                "risk_score": round(score, 4),
                "risk_category": category,
                "risk_color": risk_color(category),
                "explanation": explanation,
            }
        )

    return pd.DataFrame(rows), pd.DataFrame(importance_rows)


def _style_risk_cells(value: str) -> str:
    color_map = {
        "Low": "background-color: #dcfce7; color: #14532d; font-weight: 700",
        "Medium": "background-color: #ffedd5; color: #9a3412; font-weight: 700",
        "High": "background-color: #fee2e2; color: #991b1b; font-weight: 700",
    }
    return color_map.get(value, "")


def render_teacher_dashboard(model_pipeline) -> None:
    """Render the teacher-facing batch dashboard and exports."""
    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Teacher Dashboard")
    st.caption(
        "Analyze all students from CSV upload or local list, with risk categories and SHAP-based explanations."
    )

    source = st.radio(
        "Student source",
        options=["Upload CSV", "Use local student list"],
        horizontal=True,
    )

    batch_df = None
    if source == "Upload CSV":
        uploaded = st.file_uploader("Upload CSV", type=["csv"])
        if uploaded is not None:
            try:
                batch_df = pd.read_csv(uploaded)
            except Exception:
                st.error("Unable to parse CSV file.")
                st.markdown("</div>", unsafe_allow_html=True)
                return
    else:
        batch_df = _sample_student_table()

    if batch_df is None:
        st.info(
            "CSV must include columns: student_name, attendance_percent, avg_grade, assignments_submitted, previous_failures, feedback_text"
        )
        st.markdown("</div>", unsafe_allow_html=True)
        return

    st.markdown("#### Student List Preview")
    st.dataframe(batch_df.head(20), use_container_width=True)

    ok, message = validate_batch_dataframe(batch_df)
    if not ok:
        st.error(message)
        st.markdown("</div>", unsafe_allow_html=True)
        return

    run_predictions = st.button("Run Batch Predictions", type="primary", use_container_width=True)
    if not run_predictions:
        st.markdown("</div>", unsafe_allow_html=True)
        return

    with st.spinner("Generating predictions..."):
        result_df, importance_df = _predict_batch(model_pipeline, batch_df)

    st.success(f"Processed {len(result_df)} students")

    total_students = len(result_df)
    high_risk_count = int((result_df["risk_category"] == "High").sum())
    avg_risk = float(result_df["risk_score"].mean()) if total_students else 0.0

    metric_col1, metric_col2, metric_col3 = st.columns(3)
    metric_col1.metric("Students", total_students)
    metric_col2.metric("High Risk", high_risk_count)
    metric_col3.metric("Average Risk Score", f"{avg_risk:.3f}")

    st.markdown("#### Risk Distribution")
    category_counts = result_df["risk_category"].value_counts().reindex(["Low", "Medium", "High"], fill_value=0)
    st.bar_chart(category_counts)

    st.markdown("#### SHAP Feature Importance (Batch Aggregate)")
    if not importance_df.empty:
        feature_importance = (
            importance_df.groupby("feature", as_index=False)["abs_contribution"].mean().sort_values(
                by="abs_contribution", ascending=False
            )
        )
        st.bar_chart(feature_importance.head(10).set_index("feature"))

    st.markdown("#### Student Risk Table")
    styled_df = result_df[["student_name", "risk_score", "risk_category", "risk_color", "explanation"]].style.map(
        _style_risk_cells, subset=["risk_category"]
    )
    st.dataframe(styled_df, use_container_width=True)

    st.download_button(
        label="Download predictions CSV",
        data=result_df.to_csv(index=False).encode("utf-8"),
        file_name="disengagement_predictions.csv",
        mime="text/csv",
    )
    st.markdown("</div>", unsafe_allow_html=True)


def main() -> None:
    st.set_page_config(
        page_title="AI-Based Student Disengagement Detection System",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    apply_custom_theme()

    st.markdown(
        """
        <div class='hero-box'>
            <div class='hero-title'>AI-Based Student Disengagement Detection System</div>
            <p class='hero-subtitle'>Separate student and teacher experiences with multimodal prediction and explainable insights.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    try:
        bundle = load_model_bundle()
    except FileNotFoundError as error:
        st.error(str(error))
        return

    model_pipeline = bundle["model"]

    tab_single, tab_batch = st.tabs(["Student Interface", "Teacher Interface"])
    with tab_single:
        render_single_prediction(model_pipeline)
    with tab_batch:
        render_teacher_dashboard(model_pipeline)

    st.caption("Built with Streamlit, XGBoost, TF-IDF, TextBlob, and SHAP")


if __name__ == "__main__":
    main()
