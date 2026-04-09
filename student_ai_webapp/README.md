# AI-Based Student Disengagement Detection System

## Project Structure

```
student_ai_webapp/
│
├── data/
│   └── multimodal_student_data.csv
│
├── models/
│
├── train_model.py
├── app.py
├── requirements.txt
└── README.md
```

## Interfaces

### Student Interface

- Enter personal details and written feedback:
	- student_name
	- attendance_percent (0-100)
	- avg_grade (0-100)
	- assignments_submitted (0-10)
	- previous_failures (0-5)
	- feedback_text
- View:
	- Personal risk score
	- Risk category (Low / Medium / High)
	- Simple explanation of top risk drivers
	- Motivational improvement tip

### Teacher Interface

- Use either:
	- CSV upload, or
	- local student list preview
- Run batch predictions for all rows.
- View dashboard outputs:
	- Risk score and risk category per student
	- SHAP-based feature importance (batch aggregate)
	- Color-coded risk indicators
- Download full prediction results as CSV.

## Input Schema (Batch CSV)

Required columns:

- student_name
- attendance_percent
- avg_grade
- assignments_submitted
- previous_failures
- feedback_text

## Outputs

- risk_score (0-1)
- risk_category (Low / Medium / High)
- explanation text (from SHAP top contributors)
- top contributing features (SHAP)

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Train model (also generates data/multimodal_student_data.csv if missing):

```bash
python train_model.py
```

Data handling behavior:

- If source student datasets are available, multimodal training data is built from them.
- If source datasets are not available, the pipeline auto-generates 300 synthetic realistic student records.
- Synthetic records follow logical correlation:
	- Low attendance + negative feedback sentiment + previous failures -> higher disengagement probability.
	- High attendance + positive feedback sentiment -> lower disengagement probability.

3. Run Streamlit app:

```bash
streamlit run app.py
```

4. Run desktop app (non-Streamlit, native window on Windows):

```bash
python desktop_app.py
```

This launches a desktop application with Student and Teacher interfaces.

## Deployment

### Run locally

From `student_ai_webapp/`:

```bash
pip install -r requirements.txt
python train_model.py
streamlit run app.py
```

### Create requirements.txt

Recommended (pinned versions for reproducible deployment):

```bash
pip freeze > requirements.txt
```

If you want to keep only core project dependencies, ensure `requirements.txt` includes at least:

- streamlit
- pandas
- numpy
- scikit-learn
- joblib
- xgboost
- textblob
- shap

### Deploy on Streamlit Cloud

1. Push the project to a GitHub repository.
2. Confirm repository root contains:
	- `app.py`
	- `requirements.txt`
	- `train_model.py`
3. In Streamlit Community Cloud, click **New app**.
4. Select your GitHub repository, branch, and set main file path to `app.py`.
5. Deploy the app.

Notes for cloud deployment:

- If model files are not present in `models/`, run `python train_model.py` once locally and commit generated artifacts, or add startup logic to train automatically.
- If source datasets are unavailable in cloud, fallback synthetic data generation creates `data/multimodal_student_data.csv` automatically.
