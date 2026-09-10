# Ai-Vault
#  VaultAI

**An AI-powered personal file vault — team academic project (Stage ST-1)**

VaultAI is a web app that lets a user sign up, log in, and manage their own
files in a clean dashboard — upload, search, and delete entries, with an
AI-insights section planned for a future stage.

## Team

| Name | Role | Responsibility |
Vishwas Thakur | Team Lead & Backend Developer | Project direction, `auth.js` (signup/login/session logic), and the `mockBackend` object in `script.js` — built to mirror the real Express.js API we'll implement in later stages |
 Vanshika Rana | Frontend Developer | HTML structure, CSS styling, and all DOM rendering/display functions |
 Tanya Garg | Session & UX Developer | Logout flow, toast notifications, user-initials/avatar logic, and the AI section placeholder |

## Progress So Far 

-  Complete 5-file frontend built and working: `login.html`, `index.html`, `style.css`, `auth.js`, `script.js`
-  Signup/login flow with localStorage-based mock user database
-  Session handling with "Remember me" (localStorage vs sessionStorage)
-  File vault dashboard: upload (metadata only), live search, delete
-  Toast notifications, user avatar initials, logout flow
-  **Recent work — AI Vault section**: added an `ai-section` placeholder in the dashboard that will later surface AI-generated insights about a user's files (auto-tagging, smart search, duplicate detection). Currently shows a static placeholder while we scope this for the next stage.
-  Next up (final): swap `mockBackend` for real Express.js routes and wire in actual AI features

##  Dashboard Preview

![Dashboard Screenshot](assets/dashboard.png)

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript (no frameworks)
- `localStorage` / `sessionStorage` as a mock backend/database
- Browser File API for reading file metadata only

## Key Code Snippets

**Mock authentication — `auth.js` (Vishwas Thakur)**
javascript
function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;
  const users = getUsers();
  const matchedUser = users.find(u => u.email === email && u.password === password);
  if (!matchedUser) {
    showToast("Invalid email or password.", "error");
    return;
  }
  setSession(matchedUser, true);
  window.location.href = "index.html";
}

**AI Vault placeholder — `script.js` (Tanya Garg)**
javascript
function initAISection() {
  const aiBox = document.getElementById("ai-section");
  aiBox.innerHTML = `<p class="ai-placeholder">🤖 AI-powered file insights coming soon.</p>`;
}

## Known Limitations (ST-1)

- Passwords stored in plaintext in localStorage — acceptable only for this demo stage
- No real server, database, or HTTPS yet
- Only file metadata is stored, never actual file content

## Running Locally

1. Clone the repo
2. Open `login.html` in your browser
3. Sign up, then log in to reach the dashboard

## Roadmap

- **ST-2**: Real Express.js backend
- **ST-3**: Database + cloud storage + live AI features
