# VaultAI — Personal AI File Vault

> A secure personal digital file vault with document AI intelligence, personal notes management, and DigiLocker-style Critical Vault isolation. Built with React 19, Node.js, Express, MongoDB, Cloudinary, and Google Gemini API on a 100% free-tier architecture.

---

## Key Features

- **File Management & Folders:** Categorical folders (`College`, `Projects`, `Personal` + custom folders), live name search, file-type filtering (PDF, DOC/TXT, CSV, images), and quota bar (100MB per user).
- **Personal Notes Management:** Private text notes separate from files. Create, view, edit, search, and delete short text notes with timestamp tracking.
- **Automatic Keyword Extraction:** Extracts 5 to 8 key terms from documents upon upload or on-demand using Google Gemini AI, displayed as tags in the file table and Document Assistant.
- **Intelligent Document Categorization:** Gemini analyzes document text and suggests the most fitting folder category from the user's folder set, with a 1-click button to accept the move.
- **Document Assistant:** Ask targeted questions grounded strictly in document content, or generate structured executive summaries using Gemini AI with automatic multi-key rotation and failover.
- **Critical Vault Security:** DigiLocker-inspired secondary 6-digit numeric Vault PIN, 15-minute countdown session tokens in sessionStorage, 5-attempt database lockout, and complete isolation from normal file listings.

---

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Context API, CSS (no bloated UI libraries)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose (with embedded in-memory MongoDB fallback)
- **File Storage:** Cloudinary (with local disk `/uploads` fallback)
- **Authentication:** bcryptjs (12 salt rounds) and JSON Web Tokens (JWT)
- **Security:** express-rate-limit, ownership checks (404 anti-enumeration)
- **File Parsing:** Multer, pdf-parse
- **AI Engine:** Google Gemini API with multi-key pool rotation and automatic failover

---

## Getting Started

You need **Node.js 18 or higher** from https://nodejs.org.

Both the backend and frontend run concurrently in two separate terminals:

### 1. Terminal 1 — Backend:
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000`.*

### 2. Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` (proxied to port 5000).*

Open your browser to:
- **Application Portal:** [http://localhost:5173](http://localhost:5173) or [http://localhost:5000](http://localhost:5000)

---

## Environment Variables (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

JWT_SECRET=your_long_random_secret_string
JWT_EXPIRES_IN=2h
CRITICAL_VAULT_EXPIRES_IN=15m

MONGODB_URI=your_mongodb_connection_string

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEYS=key_one,key_two,key_three,key_four
GEMINI_MODEL=gemini-2.5-flash-lite
```

> **Zero-Config Fallback:** If `MONGODB_URI` is omitted, the app starts an embedded in-memory database automatically. If Cloudinary credentials are empty, files are safely saved to the local `backend/uploads/` directory.

---

## Folder Structure

```text
vaultai/
  backend/            <- Node.js & Express REST API
    config/           Database, Cloudinary, and Gemini AI key rotation
    controllers/      Feature controllers (auth, files, folders, notes, AI, vault)
    middleware/       JWT authentication and Multer upload handlers
    models/           Mongoose schemas (User, File, Folder, Note)
    routes/           Express router endpoints
    scripts/          Verification and test scripts
    utils/            Text extraction and formatting utilities
    uploads/          Local file storage directory
    server.js         Backend entry point
  frontend/           <- React 19 + Vite Frontend
    public/           Static assets and shield favicon
    src/
      assets/         SVG icons and images
      components/     Header, Sidebar, FileTable, NotesSection, DocumentAssistant, Modals
      context/        AuthContext and ToastContext
      pages/          LoginPage and DashboardPage
      services/       API service layer (api.js)
      styles/         Design system stylesheet (style.css)
      utils/          Formatters and helpers
      App.jsx         React Router and Protected Routes
      main.jsx        Application bootstrap
  README.md           Documentation
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account and receive permanent Vault ID
- `POST /api/auth/login` — Log in and receive JWT token
- `GET /api/auth/me` — Get current logged-in user profile

### Files
- `GET /api/files` — List files (supports `folderId`, `search`, `type` filters)
- `POST /api/files/upload` — Upload file (extracts text, keywords, and folder suggestion)
- `GET /api/files/:id/download` — Download file
- `PUT /api/files/:id/folder` — Move file to a folder (or accept AI suggestion)
- `DELETE /api/files/:id` — Permanently delete file

### Personal Notes
- `GET /api/notes` — List all private text notes for the user
- `POST /api/notes` — Create note (`title`, `body`)
- `PUT /api/notes/:id` — Update note (`title`, `body`)
- `DELETE /api/notes/:id` — Delete note

### Folders
- `GET /api/folders` — List folders with file counts
- `POST /api/folders` — Create a new folder
- `DELETE /api/folders/:id` — Delete folder (files move to All Files)

### AI Document Intelligence
- `POST /api/ai/summarize` — Generate executive summary using Gemini AI
- `POST /api/ai/ask` — Grounded Q&A answered strictly from document content
- `POST /api/ai/keywords` — Extract 5–8 key terms from document
- `POST /api/ai/categorize` — Suggest the most fitting folder category

### Critical Vault (Secured by secondary PIN & x-vault-token)
- `POST /api/vault/unlock` — Verify 6-digit PIN and issue 15-minute vault token
- `POST /api/vault/reset-pin` — Reset PIN by confirming account password
- `GET /api/vault/files` — List isolated critical documents
- `POST /api/vault/upload` — Upload confidential document
- `GET /api/vault/files/:id/download` — Download critical document
- `DELETE /api/vault/files/:id` — Delete critical document

### Stats
- `GET /api/stats` — Total files, folders, and storage accounting (MB / %)

---

## Viva & Architecture Quick Reference

1. **How is password/PIN security implemented?**
   Both account passwords and 6-digit Vault PINs are hashed using `bcryptjs` with 12 salt rounds. They are excluded from Mongoose queries via `.select('-password -vaultPin')` and schema transforms.
2. **How does Gemini multi-key rotation work?**
   `backend/config/ai.js` parses a comma-separated list of Gemini API keys, tracks in-memory status (`active`, `exhausted`, `invalid`), and automatically switches to the next working key if a quota (429) or invalid key error occurs.
3. **How does Critical Vault isolation work?**
   Critical documents have `isCritical: true` and are structurally filtered out of all standard file queries (`isCritical: { $ne: true }`). Accessing them requires the `x-vault-token` header, issued only after secondary PIN verification and stored in `sessionStorage`.
4. **How are Personal Notes secured?**
   Notes are strictly scoped to the logged-in `userId`. Any access or update attempt on a note belonging to another user returns a clean `404 Not found`, preventing data leakage or resource enumeration.