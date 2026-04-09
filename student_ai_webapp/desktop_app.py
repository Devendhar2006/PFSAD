from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import joblib
import numpy as np
import pandas as pd
import shap
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


class Predictor:
    def __init__(self) -> None:
        self.model = self._load_model()
        self._explainer = None

    def _load_model(self):
        if not MODEL_PATH.exists() and not MODEL_PKL_PATH.exists():
            raise FileNotFoundError("Model file missing. Run train_model.py first.")

        if MODEL_PKL_PATH.exists():
            return joblib.load(MODEL_PKL_PATH)

        bundle = joblib.load(MODEL_PATH)
        return bundle["model"]

    def _build_explainer(self):
        if self._explainer is None:
            classifier = self.model.named_steps["classifier"]
            self._explainer = shap.TreeExplainer(classifier)
        return self._explainer

    @staticmethod
    def _format_feature_name(raw_name: str) -> str:
        if raw_name.startswith("num__"):
            return raw_name.replace("num__", "")
        if raw_name.startswith("sentiment__"):
            return "feedback_sentiment_polarity"
        if raw_name.startswith("text__"):
            return f"feedback:{raw_name.replace('text__', '')}"
        return raw_name

    @staticmethod
    def risk_category(probability: float) -> str:
        if probability < 0.33:
            return "Low"
        if probability < 0.66:
            return "Medium"
        return "High"

    @staticmethod
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

    @staticmethod
    def summarize_explanation(contributions: list[dict]) -> str:
        readable = {
            "attendance_percent": "lower attendance",
            "avg_grade": "lower average grade",
            "assignments_submitted": "fewer assignments submitted",
            "previous_failures": "previous failures",
            "feedback_sentiment_polarity": "negative feedback sentiment",
        }

        increasing = [item for item in contributions if item["impact"] == "increases_risk"]
        if not increasing:
            return "Current strongest factors reduce disengagement risk."

        top_factors = []
        for item in increasing[:2]:
            raw = item["feature"]
            if raw.startswith("feedback:"):
                top_factors.append("phrases in written feedback")
            else:
                top_factors.append(readable.get(raw, raw.replace("_", " ")))

        if len(top_factors) == 1:
            return f"Top contributor: {top_factors[0]}."
        return f"Top contributors: {top_factors[0]} and {top_factors[1]}."

    @staticmethod
    def motivational_tip(category: str) -> str:
        if category == "Low":
            return "Great momentum. Keep attendance and assignment consistency strong."
        if category == "Medium":
            return "You are close to low risk. Improve attendance and submit assignments on time."
        return "Start with one small step this week: attend every class and submit pending work."

    def top_contributing_features(self, input_df: pd.DataFrame, top_n: int = 5) -> list[dict]:
        preprocessor = self.model.named_steps["preprocessor"]
        transformed = preprocessor.transform(input_df)
        transformed_dense = transformed.toarray() if hasattr(transformed, "toarray") else np.asarray(transformed)
        feature_names = preprocessor.get_feature_names_out()

        try:
            explainer = self._build_explainer()
            shap_output = explainer(transformed_dense)
            shap_values = getattr(shap_output, "values", shap_output)

            if isinstance(shap_values, list):
                shap_array = np.asarray(shap_values[1]) if len(shap_values) > 1 else np.asarray(shap_values[0])
            else:
                shap_array = np.asarray(shap_values)
            contribution_scores = shap_array[0]
        except Exception:
            classifier = self.model.named_steps["classifier"]
            importances = getattr(classifier, "feature_importances_", np.zeros(len(feature_names)))
            contribution_scores = transformed_dense[0] * importances

        top_indices = np.argsort(np.abs(contribution_scores))[::-1][:top_n]
        features = []
        for idx in top_indices:
            score = float(contribution_scores[idx])
            features.append(
                {
                    "feature": self._format_feature_name(feature_names[idx]),
                    "contribution": score,
                    "impact": "increases_risk" if score > 0 else "reduces_risk",
                }
            )
        return features

    def validate_batch_dataframe(self, dataframe: pd.DataFrame) -> tuple[bool, str | None]:
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
                return False, f"Invalid value in '{field}' at row {row_num}. Expected {low} to {high}."

        feedback_series = dataframe[TEXT_FIELD].astype(str).str.strip()
        empty_feedback = (
            feedback_series.eq("")
            | feedback_series.str.lower().eq("nan")
            | feedback_series.str.lower().eq("none")
        )
        if empty_feedback.any():
            row_num = int(dataframe.index[empty_feedback][0]) + 1
            return False, f"Empty feedback_text at row {row_num}."

        return True, None

    def predict_one(self, payload: dict) -> dict:
        input_df = self.build_input_frame(
            payload["attendance_percent"],
            payload["avg_grade"],
            payload["assignments_submitted"],
            payload["previous_failures"],
            payload["feedback_text"],
        )
        score = float(self.model.predict_proba(input_df)[0, 1])
        category = self.risk_category(score)
        contributions = self.top_contributing_features(input_df, top_n=5)
        explanation = self.summarize_explanation(contributions)

        return {
            "risk_score": score,
            "risk_category": category,
            "explanation": explanation,
            "tip": self.motivational_tip(category),
            "contributions": contributions,
        }

    def predict_batch(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        rows = []
        importance_rows = []

        for _, row in df.iterrows():
            result = self.predict_one(
                {
                    "attendance_percent": float(row["attendance_percent"]),
                    "avg_grade": float(row["avg_grade"]),
                    "assignments_submitted": float(row["assignments_submitted"]),
                    "previous_failures": float(row["previous_failures"]),
                    "feedback_text": str(row["feedback_text"]),
                }
            )

            rows.append(
                {
                    "student_name": str(row[NAME_FIELD]),
                    "risk_score": round(result["risk_score"], 4),
                    "risk_category": result["risk_category"],
                    "explanation": result["explanation"],
                }
            )

            for item in result["contributions"]:
                importance_rows.append(
                    {
                        "student_name": str(row[NAME_FIELD]),
                        "feature": item["feature"],
                        "abs_contribution": abs(item["contribution"]),
                    }
                )

        return pd.DataFrame(rows), pd.DataFrame(importance_rows)


class DesktopApp(tk.Tk):
    def __init__(self, predictor: Predictor) -> None:
        super().__init__()
        self.predictor = predictor
        self.title("Student Disengagement Prediction App")
        self.geometry("1120x720")
        self.minsize(980, 650)

        self.batch_df: pd.DataFrame | None = None
        self.batch_results: pd.DataFrame | None = None

        self._build_header()
        self._build_tabs()

    def _build_header(self) -> None:
        header = ttk.Frame(self, padding=14)
        header.pack(fill="x")

        title = ttk.Label(
            header,
            text="Student Disengagement Prediction",
            font=("Segoe UI", 21, "bold"),
        )
        title.pack(anchor="w")

        subtitle = ttk.Label(
            header,
            text="Desktop interface for student awareness and teacher intervention planning",
            font=("Segoe UI", 11),
        )
        subtitle.pack(anchor="w", pady=(4, 0))

    def _build_tabs(self) -> None:
        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        student_tab = ttk.Frame(notebook, padding=16)
        teacher_tab = ttk.Frame(notebook, padding=16)
        notebook.add(student_tab, text="Student Interface")
        notebook.add(teacher_tab, text="Teacher Interface")

        self._build_student_tab(student_tab)
        self._build_teacher_tab(teacher_tab)

    def _build_student_tab(self, parent: ttk.Frame) -> None:
        form = ttk.LabelFrame(parent, text="Student Check-In", padding=14)
        form.pack(fill="x", pady=(0, 12))

        self.student_name_var = tk.StringVar()
        self.attendance_var = tk.DoubleVar(value=75.0)
        self.grade_var = tk.DoubleVar(value=70.0)
        self.assignments_var = tk.DoubleVar(value=6.0)
        self.failures_var = tk.DoubleVar(value=1.0)

        ttk.Label(form, text="Student Name").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        ttk.Entry(form, textvariable=self.student_name_var, width=34).grid(row=0, column=1, sticky="ew", padx=5, pady=5)

        ttk.Label(form, text="Attendance Percent (0-100)").grid(row=1, column=0, sticky="w", padx=5, pady=5)
        ttk.Spinbox(form, from_=0, to=100, textvariable=self.attendance_var, increment=1, width=12).grid(row=1, column=1, sticky="w", padx=5, pady=5)

        ttk.Label(form, text="Average Grade (0-100)").grid(row=2, column=0, sticky="w", padx=5, pady=5)
        ttk.Spinbox(form, from_=0, to=100, textvariable=self.grade_var, increment=1, width=12).grid(row=2, column=1, sticky="w", padx=5, pady=5)

        ttk.Label(form, text="Assignments Submitted (0-10)").grid(row=3, column=0, sticky="w", padx=5, pady=5)
        ttk.Spinbox(form, from_=0, to=10, textvariable=self.assignments_var, increment=1, width=12).grid(row=3, column=1, sticky="w", padx=5, pady=5)

        ttk.Label(form, text="Previous Failures (0-5)").grid(row=4, column=0, sticky="w", padx=5, pady=5)
        ttk.Spinbox(form, from_=0, to=5, textvariable=self.failures_var, increment=1, width=12).grid(row=4, column=1, sticky="w", padx=5, pady=5)

        ttk.Label(form, text="Feedback Text").grid(row=5, column=0, sticky="nw", padx=5, pady=5)
        self.feedback_text = tk.Text(form, height=4, width=62)
        self.feedback_text.insert("1.0", "I am trying to improve but sometimes struggle to keep up with coursework.")
        self.feedback_text.grid(row=5, column=1, sticky="ew", padx=5, pady=5)

        ttk.Button(form, text="Predict Personal Risk", command=self._predict_student).grid(
            row=6, column=0, columnspan=2, sticky="ew", padx=5, pady=(10, 6)
        )

        form.columnconfigure(1, weight=1)

        result_frame = ttk.LabelFrame(parent, text="Prediction Result", padding=14)
        result_frame.pack(fill="both", expand=True)

        self.score_var = tk.StringVar(value="Risk Score: -")
        self.category_var = tk.StringVar(value="Risk Category: -")
        self.explanation_var = tk.StringVar(value="Explanation: -")
        self.tip_var = tk.StringVar(value="Tip: -")

        ttk.Label(result_frame, textvariable=self.score_var, font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=3)
        ttk.Label(result_frame, textvariable=self.category_var, font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=3)
        ttk.Label(result_frame, textvariable=self.explanation_var, wraplength=980).pack(anchor="w", pady=3)
        ttk.Label(result_frame, textvariable=self.tip_var, wraplength=980, foreground="#0f766e").pack(anchor="w", pady=3)

        self.contribution_tree = ttk.Treeview(
            result_frame,
            columns=("feature", "contribution", "impact"),
            show="headings",
            height=8,
        )
        self.contribution_tree.heading("feature", text="Feature")
        self.contribution_tree.heading("contribution", text="Contribution")
        self.contribution_tree.heading("impact", text="Impact")
        self.contribution_tree.column("feature", width=280)
        self.contribution_tree.column("contribution", width=140)
        self.contribution_tree.column("impact", width=140)
        self.contribution_tree.pack(fill="both", expand=True, pady=(8, 0))

    def _build_teacher_tab(self, parent: ttk.Frame) -> None:
        controls = ttk.Frame(parent)
        controls.pack(fill="x", pady=(0, 10))

        self.csv_path_var = tk.StringVar(value="No CSV loaded")

        ttk.Button(controls, text="Load CSV", command=self._load_csv).pack(side="left", padx=(0, 8))
        ttk.Button(controls, text="Run Batch Predictions", command=self._run_batch).pack(side="left", padx=(0, 8))
        ttk.Button(controls, text="Export Results CSV", command=self._export_batch).pack(side="left")
        ttk.Label(controls, textvariable=self.csv_path_var).pack(side="left", padx=12)

        metrics = ttk.Frame(parent)
        metrics.pack(fill="x", pady=(0, 10))
        self.total_var = tk.StringVar(value="Students: 0")
        self.high_var = tk.StringVar(value="High Risk: 0")
        self.avg_var = tk.StringVar(value="Average Risk: 0.000")

        ttk.Label(metrics, textvariable=self.total_var, font=("Segoe UI", 10, "bold")).pack(side="left", padx=(0, 16))
        ttk.Label(metrics, textvariable=self.high_var, font=("Segoe UI", 10, "bold"), foreground="#b91c1c").pack(side="left", padx=(0, 16))
        ttk.Label(metrics, textvariable=self.avg_var, font=("Segoe UI", 10, "bold")).pack(side="left")

        table_frame = ttk.LabelFrame(parent, text="Batch Results", padding=10)
        table_frame.pack(fill="both", expand=True)

        self.batch_tree = ttk.Treeview(
            table_frame,
            columns=("student_name", "risk_score", "risk_category", "explanation"),
            show="headings",
            height=14,
        )
        self.batch_tree.heading("student_name", text="Student")
        self.batch_tree.heading("risk_score", text="Risk Score")
        self.batch_tree.heading("risk_category", text="Risk Category")
        self.batch_tree.heading("explanation", text="Explanation")

        self.batch_tree.column("student_name", width=180)
        self.batch_tree.column("risk_score", width=100)
        self.batch_tree.column("risk_category", width=110)
        self.batch_tree.column("explanation", width=620)

        self.batch_tree.tag_configure("Low", background="#dcfce7")
        self.batch_tree.tag_configure("Medium", background="#ffedd5")
        self.batch_tree.tag_configure("High", background="#fee2e2")

        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.batch_tree.yview)
        self.batch_tree.configure(yscrollcommand=scroll.set)
        self.batch_tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        importance_frame = ttk.LabelFrame(parent, text="Batch SHAP Feature Importance (Top 10)", padding=10)
        importance_frame.pack(fill="x", pady=(10, 0))

        self.importance_text = tk.Text(importance_frame, height=7)
        self.importance_text.pack(fill="x")
        self.importance_text.insert("1.0", "Run batch predictions to view feature importance.")

    def _predict_student(self) -> None:
        name = self.student_name_var.get().strip()
        feedback = self.feedback_text.get("1.0", "end").strip()

        if not name:
            messagebox.showerror("Validation", "Student name is required.")
            return

        payload = {
            "attendance_percent": self.attendance_var.get(),
            "avg_grade": self.grade_var.get(),
            "assignments_submitted": self.assignments_var.get(),
            "previous_failures": self.failures_var.get(),
            "feedback_text": feedback,
        }

        try:
            result = self.predictor.predict_one(payload)
        except Exception as error:
            messagebox.showerror("Prediction Error", str(error))
            return

        self.score_var.set(f"Risk Score: {result['risk_score']:.4f}")
        self.category_var.set(f"Risk Category: {result['risk_category']}")
        self.explanation_var.set(f"Explanation: {result['explanation']}")
        self.tip_var.set(f"Tip: {result['tip']}")

        for item in self.contribution_tree.get_children():
            self.contribution_tree.delete(item)

        for row in result["contributions"]:
            self.contribution_tree.insert(
                "",
                "end",
                values=(
                    row["feature"],
                    f"{row['contribution']:.4f}",
                    row["impact"],
                ),
            )

    def _load_csv(self) -> None:
        path = filedialog.askopenfilename(
            title="Select student CSV",
            filetypes=[("CSV files", "*.csv")],
        )
        if not path:
            return

        try:
            df = pd.read_csv(path)
        except Exception as error:
            messagebox.showerror("CSV Error", f"Could not read CSV file.\n{error}")
            return

        ok, msg = self.predictor.validate_batch_dataframe(df)
        if not ok:
            messagebox.showerror("Validation Error", msg)
            return

        self.batch_df = df
        self.csv_path_var.set(path)
        messagebox.showinfo("CSV Loaded", f"Loaded {len(df)} rows successfully.")

    def _run_batch(self) -> None:
        if self.batch_df is None:
            messagebox.showwarning("No Data", "Load a valid CSV first.")
            return

        try:
            result_df, importance_df = self.predictor.predict_batch(self.batch_df)
        except Exception as error:
            messagebox.showerror("Batch Error", str(error))
            return

        self.batch_results = result_df

        for item in self.batch_tree.get_children():
            self.batch_tree.delete(item)

        for _, row in result_df.iterrows():
            self.batch_tree.insert(
                "",
                "end",
                values=(
                    row["student_name"],
                    f"{float(row['risk_score']):.4f}",
                    row["risk_category"],
                    row["explanation"],
                ),
                tags=(row["risk_category"],),
            )

        total_students = len(result_df)
        high_risk = int((result_df["risk_category"] == "High").sum())
        avg_risk = float(result_df["risk_score"].mean()) if total_students else 0.0

        self.total_var.set(f"Students: {total_students}")
        self.high_var.set(f"High Risk: {high_risk}")
        self.avg_var.set(f"Average Risk: {avg_risk:.3f}")

        self.importance_text.delete("1.0", "end")
        if not importance_df.empty:
            agg = (
                importance_df.groupby("feature", as_index=False)["abs_contribution"]
                .mean()
                .sort_values("abs_contribution", ascending=False)
                .head(10)
            )
            lines = [f"{row.feature}: {row.abs_contribution:.4f}" for row in agg.itertuples(index=False)]
            self.importance_text.insert("1.0", "\n".join(lines))
        else:
            self.importance_text.insert("1.0", "No importance data available.")

    def _export_batch(self) -> None:
        if self.batch_results is None or self.batch_results.empty:
            messagebox.showwarning("No Results", "Run batch predictions before exporting.")
            return

        path = filedialog.asksaveasfilename(
            title="Save prediction results",
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
        )
        if not path:
            return

        try:
            self.batch_results.to_csv(path, index=False)
        except Exception as error:
            messagebox.showerror("Export Error", f"Could not save file.\n{error}")
            return

        messagebox.showinfo("Export Complete", f"Saved:\n{path}")


def main() -> None:
    try:
        predictor = Predictor()
    except Exception as error:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Startup Error", str(error))
        root.destroy()
        return

    app = DesktopApp(predictor)
    app.mainloop()


if __name__ == "__main__":
    main()
