# Google OAuth Quick Setup (2 Minutes)

## Your Project Info
- **Application Name**: EduSense AI
- **Domain**: localhost:5173 & localhost:5174
- **Email Field**: Gmail-only (enforced)
- **Database**: MongoDB (cosmic-devspace)

---

## 🚀 STEP 1: Get Google Client ID (5 min)

```
1. Open: https://console.cloud.google.com
2. Create new project or select existing
3. Search "Google+ API" → Enable it
4. Click "Credentials" on left
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Application type: "Web application"
7. Name: "EduSense AI Web"
8. Under "Authorized JavaScript origins" ADD:
   → http://localhost:5173
   → http://localhost:5174
9. Click "Create"
10. Copy your Client ID (looks like):
    1234567890-abcdefghij.apps.googleusercontent.com
```

**✅ OUTCOME**: You now have your Client ID value

---

## 🔧 STEP 2: Update Backend (30 seconds)

**File**: `backend/.env`

Find this line (currently empty):
```
GOOGLE_CLIENT_ID=
```

Replace with your Client ID:
```
GOOGLE_CLIENT_ID=1234567890-abcdefghij.apps.googleusercontent.com
```

Save file.

---

## 🎨 STEP 3: Update Frontend (30 seconds)

**File**: `frontend/.env`

Find this line (currently empty):
```
VITE_GOOGLE_CLIENT_ID=
```

Replace with same Client ID:
```
VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghij.apps.googleusercontent.com
```

Save file.

---

## 🔄 STEP 4: Restart Servers (1 minute)

**Terminal 1 - Backend**:
```bash
cd backend
npm start
# Expected output: "MongoDB connected" + "Server running on port 5000"
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Expected output: "Local: http://localhost:5173"
```

---

## ✅ STEP 5: Test Google Login (1 minute)

1. Open browser: http://localhost:5173
2. Click "Continue with Google" button
3. Select your Gmail account
4. Should auto-login to Student Dashboard
5. Check MongoDB: New Student account created with your email

---

## 🎯 Done!

All three authentication methods now working:
- ✅ Email/Password (teacher.edusense.ai@gmail.com / Teacher@123)
- ✅ Email/Password New Registration
- ✅ Google OAuth (any Gmail account)

---

## 📋 Checklist

- [ ] Got Google Client ID from Google Cloud Console
- [ ] Updated `backend/.env` with GOOGLE_CLIENT_ID
- [ ] Updated `frontend/.env` with VITE_GOOGLE_CLIENT_ID
- [ ] Restarted backend server (`npm start` in backend/)
- [ ] Restarted frontend server (`npm run dev` in frontend/)
- [ ] Tested "Continue with Google" in browser
- [ ] Successfully logged in and saw dashboard

---

## ❌ If It Doesn't Work

**Google button still says "not configured"**:
- Did you restart frontend? (Hard refresh browser: Ctrl+Shift+R)
- Check if VITE_GOOGLE_CLIENT_ID value is correct in frontend/.env

**Google login shows error on button click**:
- Check if GOOGLE_CLIENT_ID value is correct in backend/.env
- Check if backend is running on port 5000
- Look at browser console (F12) for error message

**Can't create Google Cloud project**:
- Make sure you have Google account
- Try https://myaccount.google.com first
- Create new Google account if needed

---

**Status**: Ready to finish in ~2 min with your Client ID
