EduSense AI - Student Disengagement Detection System

Tech Stack
- Frontend: React + Tailwind CSS + Recharts + Framer Motion + Lucide icons
- Backend: Node.js + Express
- Database: MongoDB
- Authentication: JWT role-based login (Student and Teacher)

Folder Structure
- edusense-ai
  - backend
    - data/students.seed.json
    - scripts/seed.js
    - src
      - config/db.js
      - controllers
      - middleware
      - models
      - routes
      - services/predictService.js
      - server.js
    - package.json
    - .env.example
  - frontend
    - src
      - api/client.js
      - components
      - context/AuthContext.jsx
      - pages
      - App.jsx
      - main.jsx
      - index.css
    - package.json
    - tailwind.config.js
    - postcss.config.js
    - vite.config.js
    - .env.example

Key API Endpoints
- POST /login
- POST /register
- POST /google-login
- POST /predict
- GET /students
- GET /student/:id

Also available with prefix for frontend convenience:
- /api/login
- /api/register
- /api/google-login
- /api/predict
- /api/students
- /api/student/:id

Machine Learning Logic
- Inputs: attendance, marks, behavior, feedback text
- Process:
  - Numerical normalization
  - NLP sentiment scoring on feedback text
  - Weighted risk scoring with explanation generation
- Outputs:
  - engagement_status
  - confidence_score
  - explanation
  - suggestions

Sample Predict Output
{
  "status": "At Risk",
  "confidence": 0.87,
  "reason": "low attendance + negative sentiment in feedback detected"
}

Dummy Dataset
- 100 seeded students with realistic Indian names and profiles
- Includes feedback history, performance trend, and prediction logs
- File: backend/data/students.seed.json

Run Instructions
1) Start MongoDB locally

2) Backend setup
- Open terminal in backend folder
- Run:
  npm install
- Copy .env.example to .env and update values
  - Add valid GOOGLE_CLIENT_ID from Google Cloud OAuth credentials
- Seed data:
  npm run seed
- Start backend:
  npm run dev

3) Frontend setup
- Open terminal in frontend folder
- Run:
  npm install
- Copy .env.example to .env
  - Add the same VITE_GOOGLE_CLIENT_ID value used by backend
- Start frontend:
  npm run dev

4) Open app
- http://localhost:5173

Google Sign-In Setup
- Create OAuth 2.0 Client ID (Web application) in Google Cloud Console.
- Authorized JavaScript origins should include:
  - http://localhost:5173
- Add the same client ID in both env files:
  - backend/.env -> GOOGLE_CLIENT_ID=...
  - frontend/.env -> VITE_GOOGLE_CLIENT_ID=...
- Restart backend and frontend after updating env files.
- First-time Google users are auto-registered as Student accounts.

Demo Credentials
- Teacher
  - Email: teacher.edusense.ai@gmail.com
  - Password: Teacher@123
- Student sample
  - Email: edu0001@gmail.com
  - Password: Student@123

Features Delivered
- Student interface
  - Profile summary
  - Engagement input form
  - AI output with status, confidence progress, explanation, and suggestions
  - Performance trend line chart
  - Engagement split pie chart
  - Prediction loading animation
- Teacher interface
  - Sidebar-driven admin dashboard
  - Full student table with search and risk filters
  - Student detail panel with profile, feedback history, graphs, prediction logs
  - Analytics cards and charts
  - Alerts for high-risk students
- Error handling
  - API validation and auth errors
  - Login errors and prediction errors surfaced in UI
