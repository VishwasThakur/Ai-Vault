const USERS_KEY = "vaultai_users";
const SESSION_KEY = "vaultai_session";

function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(user, persist) {
  const payload = JSON.stringify({ name: user.name, email: user.email });
  if (persist) {    AbortController
    localStorage.setItem(SESSION_KEY, payload);
  } else {
    sessionStorage.setItem(SESSION_KEY, payload);
  }
}

function alreadyLoggedIn() {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}

if (alreadyLoggedIn()) {
  window.location.href = "index.html";
}

const loginCard = document.getElementById("loginCard");
const signupCard = document.getElementById("signupCard");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

document.getElementById("showSignup").addEventListener("click", (e) => {
  e.preventDefault();
  loginCard.style.display = "none";
  signupCard.style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  signupCard.style.display = "none";
  loginCard.style.display = "block";
});

document.getElementById("forgotLink").addEventListener("click", (e) => {
  e.preventDefault();
  loginError.textContent = "Password reset will be available once the backend is connected.";
});

document.getElementById("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  signupError.textContent = "";

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;

  if (!name || !email || !password) {
    signupError.textContent = "Please fill in every field.";
    return;
  }

  const users = getUsers();
  if (users.some((u) => u.email === email)) {
    signupError.textContent = "An account with this email already exists.";
    return;
  }

  const newUser = { name, email, password };
  users.push(newUser);
  saveUsers(users);
  setSession(newUser, true);
  window.location.href = "index.html";
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const remember = document.getElementById("rememberMe").checked;

  const users = getUsers();
  const match = users.find((u) => u.email === email && u.password === password);

  if (!match) {
    loginError.textContent = "Email or password is incorrect.";
    return;
  }

  setSession(match, remember);
  window.location.href = "index.html";
});
