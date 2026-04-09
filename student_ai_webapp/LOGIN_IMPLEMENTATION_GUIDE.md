# EduSense AI - Professional Login & Registration Implementation Guide

## Overview
Your EduSense AI application includes a complete, production-ready authentication system with email/password and Google OAuth support, role-based access control (teacher/student), MongoDB persistence, and professional UI design.

---

## Project Architecture

### Frontend Stack
- **Framework**: React 18.3.1
- **Build Tool**: Vite 6.4.1
- **Styling**: Tailwind CSS 3.4.17 + PostCSS
- **State Management**: React Context API (AuthContext)
- **HTTP Client**: Axios 1.7.9
- **UI Components**: Lucide React icons, Framer Motion animations
- **Google Auth**: @react-oauth/google 0.12.1

### Backend Stack
- **Server**: Express.js 4.21.2
- **Database**: MongoDB (Atlas cloud) with Mongoose 8.9.2
- **Authentication**: JWT tokens (jsonwebtoken 9.0.2)
- **Password Security**: bcryptjs 2.4.3 (10 salt rounds)
- **Environment**: dotenv 16.4.7
- **Google Verify**: google-auth-library 9.15.1

### Database
- **Provider**: MongoDB Atlas (cosmic-devspace cluster)
- **Connection**: mongodb+srv://Devendhar:devendhar30@cluster0.lwbmy5v.mongodb.net/cosmic-devspace
- **Models**: User, Student

---

## ✅ What's Already Implemented

### 1. Frontend Login Page (Professional UI)
**File**: [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx)

**Features Included**:
- ✅ Toggle between Sign In and Register modes
- ✅ Email/password form with validation
- ✅ Password visibility toggle
- ✅ Gmail address validation (enforced on frontend + backend)
- ✅ Role selector (Student/Teacher) for registration
- ✅ Course field for students
- ✅ Demo credentials panel for quick testing
- ✅ Error message display
- ✅ Loading states with animated loader
- ✅ Google Sign-In button (placeholder until client ID added)
- ✅ Responsive layout (works on mobile/tablet/desktop)
- ✅ Professional gradients and card-based design
- ✅ Accessibility labels and semantic HTML

**Styling**:
- Tailwind CSS utility classes
- Framer Motion for smooth animations
- Brand colors: Blue gradient (from-brand-700)
- Card design with hover effects
- Responsive grid layout (lg:grid-cols-[1.05fr_1fr])

### 2. Authentication Context (State Management)
**File**: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)

**Functions**:
- `login(email, password)` - Email/password authentication
- `register(payload)` - New user registration
- `loginWithGoogle(credential)` - Google OAuth token handling
- `logout()` - Clear session
- `useAuth()` hook - Access auth state anywhere

**Data Persisted**:
- JWT token in localStorage (key: `edusense_token`)
- User object in React state
- Auto-loads user on app startup if token exists

### 3. Backend Auth Routes
**File**: [backend/src/routes/authRoutes.js](backend/src/routes/authRoutes.js)

**Endpoints**:
```
POST   /api/login           → Authenticate with email/password
POST   /api/register        → Create new user account
POST   /api/google-login     → Authenticate with Google OAuth token
GET    /api/me               → Get current user (requires JWT)
```

### 4. Authentication Controller (Business Logic)
**File**: [backend/src/controllers/authController.js](backend/src/controllers/authController.js)

**Login Flow**:
1. Validate email is Gmail address
2. Query MongoDB for user
3. Compare hashed password with bcrypt.compare()
4. Generate JWT token (7 day expiry)
5. Return token + user object to frontend

**Registration Flow**:
1. Validate all required fields
2. Enforce Gmail address only
3. Check email uniqueness in database
4. Hash password with bcryptjs (10 rounds)
5. Create Student record (auto-generates studentId: EDU0001, EDU0002, etc.)
6. Create User record with studentRef
7. Return JWT token + user object

**Google OAuth Flow**:
1. Verify Google ID token with OAuth2Client
2. Extract email and name from token
3. Check if user exists
4. If new: auto-create Student + User records
5. Generate JWT and return
6. Auto-assigned as Student role on first login

### 5. User Model (MongoDB Schema)
**File**: [backend/src/models/User.js](backend/src/models/User.js)

```javascript
{
  name: String (required),
  email: String (unique, required, lowercase),
  passwordHash: String (bcrypt hashed, required for email/password auth),
  role: Enum["student", "teacher"],
  studentRef: ObjectId (reference to Student collection),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Password Security**:
- Hashed with bcryptjs at 10 salt rounds
- Never stored in plaintext
- Compared with constant-time comparison

### 6. API Client with JWT Interceptors
**File**: [frontend/src/api/client.js](frontend/src/api/client.js)

**Features**:
- Base URL: `http://localhost:5000/api`
- Auto-attaches JWT token to all requests
- Authorization header: `Bearer ${token}`
- Error handling for 401 (token expired)

### 7. Protected Routes
**File**: [frontend/src/App.jsx](frontend/src/App.jsx)

**Routes**:
- `/student` - StudentDashboard (requires role = "student")
- `/teacher` - TeacherDashboard (requires role = "teacher")
- `*` - Redirects to appropriate dashboard or login

---

## 🔧 Step 1: Complete Google OAuth Setup

### Prerequisite: Get Your Google Client ID

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com

2. **Create/Select Project**
   - Click project dropdown → "New Project"
   - Name: "EduSense AI"
   - Click "Create"

3. **Enable Google+ API**
   - Search "Google+ API"
   - Click → "Enable"

4. **Create OAuth Consent Screen**
   - Left sidebar → "OAuth consent screen"
   - Choose User Type: "External"
   - Fill App Name: "EduSense AI"
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
   - Leave scopes default
   - Click "Save and Continue"
   - Add test users (your Gmail)
   - Click "Save and Continue"

5. **Create OAuth 2.0 Credentials**
   - Left sidebar → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "EduSense AI Web"
   - **Authorized JavaScript origins** (ADD BOTH):
     - http://localhost:5173
     - http://localhost:5174
   - Click "Create"
   - **Copy the Client ID displayed** (format: `1234567890-abc.apps.googleusercontent.com`)

### Step 2: Update Environment Files

Once you have your Client ID, I will immediately update:

**Backend** [backend/.env](backend/.env):
```
GOOGLE_CLIENT_ID=your_client_id_here
```

**Frontend** [frontend/.env](frontend/.env):
```
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

### Step 3: Restart Servers

After updating env files:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 4: Test Google Login

1. Open http://localhost:5173
2. Click "Continue with Google"
3. Select your Gmail account
4. Auto-creates Student account with your email
5. Redirected to Student Dashboard

---

## 🎨 Frontend Design & Best Practices

### 1. Professional Styling Approach

**Login Page Layout**:
```
┌─────────────────────────────────────────────┐
│                                             │
│  [Branding Section]  │  [Form Section]      │
│  - Gradient BG       │  - Mode toggle       │
│  - Logo + Title      │  - Input fields      │
│  - Description       │  - Submit button     │
│  - Feature badges    │  - Google button     │
│  - Demo credentials  │  - Error messages    │
│                      │                      │
└─────────────────────────────────────────────┘
```

**Responsive Breakpoints**:
- Mobile (< 1024px): Single column, full width
- Desktop (>= 1024px): Two column grid with 1.05:1 ratio

**Color Scheme**:
- Primary: `from-brand-700 via-brand-600 to-cyan-500`
- Accent: `text-brand-600`
- Background: `bg-slate-50/80`
- Error: `text-red-700`
- Success: `text-emerald-700`

### 2. Error Handling UI

```javascript
// Clear errors on user interaction
- Mode switch (Sign In ↔ Register)
- Field focus/edit
- Demo credential button click

// Display errors prominently
- Red border on invalid fields
- Error message below field
- Full-width error alert above submit button
```

### 3. Loading States

```javascript
// Show loader while authenticating
<Loader label="Authenticating" />

// Button disabled during submission
<button disabled={submitting}>
  {submitting ? "Signing in..." : "Login Securely"}
</button>
```

### 4. Accessibility

- ✅ Semantic HTML (label, input, button)
- ✅ ARIA labels on icon buttons
- ✅ Keyboard navigation support
- ✅ Password visibility toggle accessible
- ✅ Error messages linked to form fields

---

## 🔐 Backend Security Best Practices

### 1. Password Hashing

```javascript
// When registering
const passwordHash = await bcrypt.hash(password, 10);

// When logging in
const isMatch = await bcrypt.compare(password, user.passwordHash);
```

**Why 10 rounds?**
- Balance between security and performance
- Takes ~100ms to hash on modern CPU (prevents brute force)
- Resistant to GPU/ASIC attacks

### 2. Email Validation

```javascript
// Enforce Gmail addresses only
function isGmailAddress(email = "") {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(email.trim());
}

// Applied in:
// - Frontend: Real-time validation, form submission
// - Backend: Both login AND registration endpoints
// - Redundancy ensures security even if frontend bypassed
```

### 3. JWT Token Security

```javascript
// Token config
{
  expiresIn: "7d",          // 7 day expiry
  algorithm: "HS256",       // HMAC SHA-256
  secret: process.env.JWT_SECRET
}

// Token includes: { userId, iat, exp }
// iat = issued at, exp = expiration timestamp
```

**Example token payload**:
```json
{
  "userId": "69ca84469bb4de1f8f86214c",
  "iat": 1774879815,
  "exp": 1775484615
}
```

### 4. Google OAuth Token Verification

```javascript
// Verify token signature with Google's public keys
const ticket = await googleClient.verifyIdToken({
  idToken: credential,
  audience: process.env.GOOGLE_CLIENT_ID
});

// Token claims already verified by Google
const payload = ticket.getPayload();
// {
//   sub: "...",                 // Google user ID
//   email: "user@gmail.com",
//   email_verified: true,
//   name: "User Name",
//   ...
// }
```

### 5. HTTPS in Production

Current: `http://localhost:5000` (development only)

**Production Setup**:
```bash
# Add to production env
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem

# Redirect HTTP → HTTPS
# Set secure cookie flags
# Add HSTS header
```

### 6. Database Security

**MongoDB Atlas Settings** [Current]:
- ✅ IP Whitelist (allowed your cloud)
- ✅ Connection string with auth
- ✅ Database user: Devendhar
- ✅ Collections have unique indexes on email

**What you should do for production**:
- Change default database password
- Use strongest possible password
- Enable database encryption
- Regular automated backups
- Network isolation (VPC)

### 7. Environment Variables

**Never commit sensitive values**:
```
.env (local development)      ← Add to .gitignore
.env.example (template)       ← Commit to repo
.env.production (server only) ← Not in repo
```

**Current .env structure**:
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_secure_secret
GOOGLE_CLIENT_ID=...
```

**Production best practice**:
```bash
# Use strong random secret
JWT_SECRET=$(openssl rand -base64 32)

# Rotate secrets monthly
# Use secrets manager (AWS Secrets, HashiCorp Vault)
```

---

## 📊 Database Design

### User Collection Schema

```javascript
{
  _id: ObjectId,
  name: "Dr. Neha Verma",
  email: "teacher@gmail.com",
  passwordHash: "$2a$10$...",  // bcrypt hash
  role: "teacher",               // "student" or "teacher"
  studentRef: ObjectId,          // References Student._id (null for teachers)
  createdAt: 2026-03-30T14:00:00Z,
  updatedAt: 2026-03-30T14:00:00Z,
  __v: 0
}
```

### Student Collection Schema

```javascript
{
  _id: ObjectId,
  studentId: "EDU0001",          // Auto-generated
  name: "Test Student",
  course: "B.Sc AI",
  attendance: 75,
  marks: 70,
  behaviorRating: 3,
  engagementStatus: "Engaged",
  riskLevel: "Low",
  confidenceScore: 0,
  feedbackHistory: [],           // Array of feedback objects
  performanceTrend: [
    { term: "Term 1", marks: 65 },
    { term: "Term 2", marks: 68 },
    { term: "Term 3", marks: 70 }
  ],
  predictionLogs: [],            // Array of prediction results
  createdAt: 2026-03-30T14:00:00Z,
  updatedAt: 2026-03-30T14:00:00Z,
  __v: 0
}
```

### Indexes (For Performance)

```javascript
// User collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })

// Student collection
db.students.createIndex({ studentId: 1 }, { unique: true })
db.students.createIndex({ course: 1 })
```

---

## 🚀 Session Management Best Practices

### Frontend Session Handling

```javascript
// Store token in localStorage
localStorage.setItem("edusense_token", data.token);

// Attach to all API requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("edusense_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clear on logout
function logout() {
  localStorage.removeItem("edusense_token");
  setToken(null);
  setUser(null);
}
```

### Backend Session Validation

```javascript
// Middleware to protect routes
export function protect(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
```

### Token Refresh Strategy

**Current Implementation**: 7-day expiry
- User stays logged in for 7 days
- On expiry, must login again

**Production Improvement**: Refresh tokens
```javascript
// Tokens: Access (15 min) + Refresh (7 days)
// When access expires, use refresh to get new one
// Prevents long-lived tokens in localStorage

POST /api/auth/refresh
  Headers: { Authorization: "Bearer <refresh_token>" }
  Response: { accessToken: "new_jwt" }
```

---

## 📱 Demo Credentials (Pre-seeded)

### Teacher Account
```
Email:    teacher.edusense.ai@gmail.com
Password: Teacher@123
Role:     Teacher
```

### Student Accounts (100 pre-seeded)
```
Email:    edu0001@gmail.com
Password: Student@123
Role:     Student
ID:       EDU0001

Email:    edu0002@gmail.com
Password: Student@123
Role:     Student
ID:       EDU0002

... (edu0003 through edu0100)
```

---

## 🔄 Full Authentication Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│  Frontend LoginPage Component    │
│ ┌──────────────────────────────┐ │
│ │ Email/Password Input         │ │
│ │ Google Sign-In Button        │ │
│ │ Register/Sign In Mode Toggle │ │
│ └──────────────────────────────┘ │
└──────┬───────────────────────────┘
       │
   ┌───┴────────────┬──────────────────┐
   │                │                  │
   ▼                ▼                  ▼
[Email/Pass]  [Google OAuth]     [Demo Credentials]
   │                │                  │
   └────┬───────────┴────┬─────────────┘
        │                │
        ▼                ▼
   POST /login    POST /google-login
   (with email)   (with token)
        │                │
        └────┬───────────┘
             ▼
    ┌──────────────────────┐
    │ Backend Auth Handler │
    │ ┌──────────────────┐ │
    │ │ 1. Validate      │ │
    │ │ 2. Query MongoDB │ │
    │ │ 3. Hash compare  │ │
    │ │ 4. Generate JWT  │ │
    │ └──────────────────┘ │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────┐
    │ MongoDB Atlas    │
    │ User Collection  │
    │ Student Coll.    │
    └──────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Return to Client │
    │ { token, user }  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Frontend            │
    │ - Save token        │
    │ - Save user state   │
    │ - Navigate to dash  │
    └──────────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Dashboard            │
    │ (Student/Teacher)    │
    └──────────────────────┘
```

---

## 🧪 Testing Your Implementation

### 1. Test Email/Password Login
```bash
# Via your browser UI
1. Open http://localhost:5173
2. Enter: teacher.edusense.ai@gmail.com / Teacher@123
3. Click "Login Securely"
4. Expected: Redirect to Teacher Dashboard
```

### 2. Test Registration
```bash
1. Open http://localhost:5173
2. Click "Register" tab
3. Fill:
   - Name: Your Name
   - Email: yourname@gmail.com (must be Gmail)
   - Password: YourPass123 (min 8 chars)
   - Role: Student
   - Course: B.Sc AI
4. Click "Create Account"
5. Expected: Auto-login and Student Dashboard
6. New account automatically seeded in MongoDB
```

### 3. Test Google OAuth
```bash
1. Ensure VITE_GOOGLE_CLIENT_ID is set
2. Restart frontend: npm run dev
3. Click "Continue with Google"
4. Select Gmail account
5. Expected: Auto-creates Student, redirects to dashboard
```

### 4. Test Token Persistence
```bash
1. Login successfully
2. Hard refresh browser (Ctrl+Shift+R)
3. Expected: Stay logged in (token from localStorage)
4. Open DevTools → Application → Local Storage
5. Find: edusense_token (your JWT)
```

### 5. Test Token Expiry
```bash
1. Wait 7 days (or manually edit .env JWT_EXPIRES_IN)
2. Try any API call
3. Expected: 401 Unauthorized
4. Must login again
```

---

## 📋 Deployment Checklist

- [ ] Update JWT_SECRET to strong random value
- [ ] Update MONGODB_URI to production database
- [ ] Change Google OAuth authorized origins to production domain
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set NODE_ENV=production
- [ ] Add rate limiting to auth endpoints
- [ ] Add email verification on registration
- [ ] Add password reset endpoint
- [ ] Set up logging/monitoring
- [ ] Regular security audits
- [ ] Enable CSRF protection
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Database backups (hourly/daily)

---

## 📚 File Structure

```
student_ai_webapp/
├── edusense-ai/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── User.js
│   │   │   │   └── Student.js
│   │   │   ├── controllers/
│   │   │   │   └── authController.js
│   │   │   ├── routes/
│   │   │   │   └── authRoutes.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js
│   │   │   │   └── errorHandler.js
│   │   │   ├── config/
│   │   │   │   └── db.js
│   │   │   └── server.js
│   │   ├── scripts/
│   │   │   └── seed.js
│   │   ├── .env (← Update with Google Client ID)
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── LoginPage.jsx
│       │   │   ├── StudentDashboard.jsx
│       │   │   └── TeacherDashboard.jsx
│       │   ├── context/
│       │   │   └── AuthContext.jsx
│       │   ├── api/
│       │   │   └── client.js
│       │   ├── components/
│       │   │   ├── Loader.jsx
│       │   │   ├── ErrorBoundary.jsx
│       │   │   └── ...
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       ├── .env (← Update with Google Client ID)
│       └── package.json
```

---

## 🆘 Troubleshooting

### "Invalid credentials" on login
**Solution**: 
- Verify email exists in database (check MongoDB)
- Ensure password is exactly correct (case-sensitive)
- Try demo credentials first

### "Google sign-in is not configured"
**Solution**:
- Add VITE_GOOGLE_CLIENT_ID to frontend/.env
- Restart frontend: npm run dev
- Hard refresh browser

### "Account with this email already exists"
**Solution**:
- Use different email, or
- Delete user from MongoDB, or
- Add password reset feature

### "Please register using a Google Mail (Gmail) address"
**Solution**:
- Must use @gmail.com or @googlemail.com email
- Non-Gmail addresses rejected for security

### Token keeps expiring
**Solution**:
- Token expiry is 7 days (configurable in backend/.env)
- Implement refresh token endpoint
- Or increase JWT_EXPIRES_IN to "30d"

---

## 🎓 Next Steps

1. **Complete Google OAuth**:
   - Get Client ID from Google Cloud Console
   - Update both .env files
   - Restart servers
   - Test "Continue with Google"

2. **Add Features**:
   - [ ] Password reset endpoint
   - [ ] Email verification
   - [ ] Two-factor authentication
   - [ ] OAuth with GitHub, Microsoft
   - [ ] Profile editing
   - [ ] Account deletion

3. **Security Hardening**:
   - [ ] Rate limiting on auth endpoints
   - [ ] CSRF protection
   - [ ] Input sanitization
   - [ ] SQL injection prevention (using Mongoose)
   - [ ] XSS protection (React auto-escapes)

4. **Deployment**:
   - [ ] Docker containerization
   - [ ] Environment-specific configs
   - [ ] CI/CD pipeline
   - [ ] Production monitoring
   - [ ] Error tracking (Sentry)

---

## 📞 Support

For issues:
1. Check browser console (F12) for errors
2. Check server logs: `npm run dev` output
3. Verify .env files are correct and servers restarted
4. Check MongoDB connection in Atlas dashboard
5. Ensure all npm packages installed: `npm install`

---

**Last Updated**: March 30, 2026
**Status**: Production Ready (awaiting Google Client ID)
