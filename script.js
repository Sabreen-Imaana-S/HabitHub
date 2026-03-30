// script.js: Handles login and signup authentication logic

const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginMessage = document.getElementById('loginMessage');
const signupMessage = document.getElementById('signupMessage');

function getUsers() {
  return JSON.parse(localStorage.getItem('habitHubUsers') || '{"users": []}');
}

function setUsers(data) {
  localStorage.setItem('habitHubUsers', JSON.stringify(data));
}

function setCurrentUser(email) {
  localStorage.setItem('habitHubCurrentUser', email);
}

function showMessage(element, message, color = '#e74c3c') {
  element.textContent = message;
  element.style.color = color;
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function setupTabEvents() {
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  });

  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });
}

function checkSession() {
  const isLoggedIn = localStorage.getItem('habitHubIsLoggedIn');
  if (isLoggedIn === 'true') {
    window.location.href = 'dashboard.html';
  }
}

function initAuth() {
  checkSession();
  setupTabEvents();

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupMessage.textContent = '';

    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (!username || !email || !password) {
      showMessage(signupMessage, 'Please fill in all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      showMessage(signupMessage, 'Invalid email format.');
      return;
    }

    if (password.length < 4) {
      showMessage(signupMessage, 'Password must be at least 4 characters.');
      return;
    }

    const data = getUsers();
    if (data.users.find((u) => u.email === email)) {
      showMessage(signupMessage, 'Email is already registered.');
      return;
    }

    const newUser = {
      username,
      email,
      password,
      habits: []
    };

    data.users.push(newUser);
    setUsers(data);
    showMessage(signupMessage, 'Signup successful! Please login.', '#2ecc71');

    signupForm.reset();
    loginTab.click();
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginMessage.textContent = '';

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showMessage(loginMessage, 'Provide both email and password.');
      return;
    }

    const data = getUsers();
    const user = data.users.find((u) => u.email === email && u.password === password);

    if (!user) {
      showMessage(loginMessage, 'Invalid email or password.');
      return;
    }

    localStorage.setItem('habitHubIsLoggedIn', 'true');
    setCurrentUser(user.email);
    window.location.href = 'dashboard.html';
  });
}

initAuth();
