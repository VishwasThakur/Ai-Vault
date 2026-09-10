const SESSION_KEY = "vaultai_session";
const STORAGE_KEY = "vaultai_demo_files";

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

const session = getSession();
if (!session) {
  window.location.href = "login.html";
}

const SAMPLE_FILES = [
  { id: "f1", name: "BEE_Project_Report.pdf", folder: "College", size: 842000, type: "pdf" },
  { id: "f2", name: "DBMS_Notes.pdf", folder: "College", size: 1230000, type: "pdf" },
  { id: "f3", name: "Resume.pdf", folder: "Personal", size: 96000, type: "pdf" },
  { id: "f4", name: "Project_Documentation.docx", folder: "Projects", size: 455000, type: "docx" },
];

const mockBackend = {
  getFiles() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_FILES));
      return SAMPLE_FILES;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return SAMPLE_FILES;
    }
  },

  uploadFile(fileObj, folder) {
    const files = this.getFiles();
    const newFile = {
      id: "f" + Date.now(),
      name: fileObj.name,
      folder: folder || "Projects",
      size: fileObj.size,
      type: guessFileType(fileObj.name),
    };
    files.push(newFile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    return newFile;
  },

  deleteFile(id) {
    let files = this.getFiles();
    files = files.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  },

  addFolder(name) {
    return name;
  },
};

function guessFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function fileIconLabel(type) {
  switch (type) {
    case "pdf": return "PDF";
    case "docx": return "DOC";
    case "image": return "IMG";
    default: return "FILE";
  }
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

let currentFolder = "All Files";
let currentSearch = "";
let currentTypeFilter = "all";

const fileTableBody = document.getElementById("fileTableBody");
const emptyState = document.getElementById("emptyState");
const fileCountTag = document.getElementById("fileCountTag");
const statTotalFiles = document.getElementById("statTotalFiles");
const statFolders = document.getElementById("statFolders");
const statStorage = document.getElementById("statStorage");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const folderList = document.getElementById("folderList");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const aiFileSelect = document.getElementById("aiFileSelect");
const aiResponseBox = document.getElementById("aiResponseBox");
const toast = document.getElementById("toast");
const avatarBtn = document.getElementById("avatarBtn");
const userNameTag = document.getElementById("userNameTag");

function renderFiles() {
  const allFiles = mockBackend.getFiles();

  const filtered = allFiles.filter((f) => {
    const matchesFolder = currentFolder === "All Files" || f.folder === currentFolder;
    const matchesSearch = f.name.toLowerCase().includes(currentSearch.toLowerCase());
    const matchesType = currentTypeFilter === "all" || f.type === currentTypeFilter;
    return matchesFolder && matchesSearch && matchesType;
  });

  fileTableBody.innerHTML = "";
  emptyState.style.display = filtered.length === 0 ? "block" : "none";

  filtered.forEach((file) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="file-name-cell">
          <div class="file-icon type-${file.type}">${fileIconLabel(file.type)}</div>
          <span class="file-name">${file.name}</span>
        </div>
      </td>
      <td>${file.folder}</td>
      <td>${formatSize(file.size)}</td>
      <td>
        <div class="file-actions">
          <button class="btn btn-small action-open" data-id="${file.id}">Open</button>
          <button class="btn btn-small action-delete" data-id="${file.id}">Delete</button>
        </div>
      </td>
    `;
    fileTableBody.appendChild(row);
  });

  document.querySelectorAll(".action-open").forEach((btn) => {
    btn.addEventListener("click", () => openFile(btn.dataset.id));
  });
  document.querySelectorAll(".action-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      mockBackend.deleteFile(btn.dataset.id);
      showToast("File deleted");
      renderFiles();
      updateStats();
      populateAiDropdown();
    });
  });

  fileCountTag.textContent = filtered.length + (filtered.length === 1 ? " file" : " files");
}

function updateStats() {
  const files = mockBackend.getFiles();
  statTotalFiles.textContent = files.length;
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  statStorage.textContent = formatSize(totalBytes);
  statFolders.textContent = folderList.querySelectorAll(".folder-item").length;
}

function populateAiDropdown() {
  const files = mockBackend.getFiles();
  aiFileSelect.innerHTML = '<option value="">Select a file</option>';
  files.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    aiFileSelect.appendChild(opt);
  });
}

function openFile(id) {
  const file = mockBackend.getFiles().find((f) => f.id === id);
  showToast(`Opening "${file.name}" (demo only, no backend yet)`);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (!files.length) return;

  for (const f of files) {
    mockBackend.uploadFile(f, currentFolder === "All Files" ? "Projects" : currentFolder);
  }

  showToast(files.length > 1 ? `${files.length} files added` : "File added");
  renderFiles();
  updateStats();
  populateAiDropdown();
  fileInput.value = "";
});

searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderFiles();
});

typeFilter.addEventListener("change", (e) => {
  currentTypeFilter = e.target.value;
  renderFiles();
});

folderList.addEventListener("click", (e) => {
  const item = e.target.closest(".folder-item");
  if (!item) return;
  document.querySelectorAll(".folder-item").forEach((i) => i.classList.remove("active"));
  item.classList.add("active");
  currentFolder = item.dataset.folder;
  renderFiles();
});

function handleAddFolder() {
  const name = prompt("New folder name:");
  if (!name || !name.trim()) return;

  mockBackend.addFolder(name.trim());

  const li = document.createElement("li");
  li.className = "folder-item";
  li.dataset.folder = name.trim();
  li.innerHTML = `<span class="folder-dot dot-projects"></span><span>${name.trim()}</span>`;
  folderList.appendChild(li);

  updateStats();
  showToast(`Folder "${name.trim()}" created`);
}

document.getElementById("addFolderBtn").addEventListener("click", handleAddFolder);
document.getElementById("addFolderBtnSide").addEventListener("click", handleAddFolder);

document.getElementById("summarizeBtn").addEventListener("click", () => {
  const id = aiFileSelect.value;
  if (!id) {
    aiResponseBox.style.display = "block";
    aiResponseBox.textContent = "Select a file first.";
    return;
  }
  const file = mockBackend.getFiles().find((f) => f.id === id);
  aiResponseBox.style.display = "block";
  aiResponseBox.textContent = `The backend AI module will summarize "${file.name}" here.`;
});

document.getElementById("askAiBtn").addEventListener("click", () => {
  const id = aiFileSelect.value;
  if (!id) {
    aiResponseBox.style.display = "block";
    aiResponseBox.textContent = "Select a file first.";
    return;
  }
  const file = mockBackend.getFiles().find((f) => f.id === id);
  aiResponseBox.style.display = "block";
  aiResponseBox.textContent = `The backend AI module will answer questions about "${file.name}" here.`;
});

avatarBtn.addEventListener("click", () => {
  const confirmLogout = confirm("Log out of VaultAI?");
  if (!confirmLogout) return;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
});

if (session) {
  avatarBtn.textContent = getInitials(session.name);
  userNameTag.textContent = session.name;
}

renderFiles();
updateStats();
populateAiDropdown();
