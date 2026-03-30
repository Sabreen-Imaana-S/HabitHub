// dashboard.js: Handles habit tracker features and session protection

const currentUserEmail = localStorage.getItem('habitHubCurrentUser');
const isLoggedIn = localStorage.getItem('habitHubIsLoggedIn');

const displayUser = document.getElementById('displayUser');
const todayDate = document.getElementById('todayDate');
const habitForm = document.getElementById('habitForm');
const habitNameInput = document.getElementById('habitName');
const habitList = document.getElementById('habitList');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const streakValue = document.getElementById('streakValue');
const weeklyValue = document.getElementById('weeklyValue');
const weeklyTotal = document.getElementById('weeklyTotal');
const weekDays = document.getElementById('weekDays');
const filterButtons = document.querySelectorAll('.filter-btn');
const logoutBtn = document.getElementById('logoutBtn');
const darkModeBtn = document.getElementById('darkModeBtn');

let usersData = JSON.parse(localStorage.getItem('habitHubUsers') || '{"users": []}');
let currentUser = null;
let currentFilter = 'all';

function redirectToLogin() {
  localStorage.removeItem('habitHubIsLoggedIn');
  localStorage.removeItem('habitHubCurrentUser');
  window.location.href = 'index.html';
}

function loadUser() {
  if (isLoggedIn !== 'true' || !currentUserEmail) return redirectToLogin();

  currentUser = usersData.users.find((u) => u.email === currentUserEmail);
  if (!currentUser) return redirectToLogin();

  displayUser.textContent = currentUser.username;
}

function formatDate(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function formatReadableDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function saveUsers() {
  localStorage.setItem('habitHubUsers', JSON.stringify(usersData));
}

function calculateProgress() {
  const habits = currentUser.habits;
  if (!habits.length) {
    progressBar.style.width = '0%';
    progressLabel.textContent = '0% completed';
    return;
  }

  const completed = habits.filter((h) => h.completed).length;
  const percentage = Math.round((completed / habits.length) * 100);
  progressBar.style.width = percentage + '%';
  progressLabel.textContent = `${percentage}% completed`;
}

function calculateStreak() {
  const habits = currentUser.habits;
  const today = formatDate();
  const dates = new Set();

  habits.forEach((habit) => {
    (habit.completedDates || []).forEach((dt) => dates.add(dt));
  });

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = formatDate(date);

    if (dates.has(key)) {
      streak += 1;
    } else {
      if (i === 0) {
        streak = 0;
      }
      break;
    }
  }

  streakValue.textContent = streak;
  streakValue.className = 'streak-value';
}

function renderWeekHistory() {
  weekDays.innerHTML = '';

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(formatDate(date));
  }

  const datesCompleted = days.map((day) => {
    const total = currentUser.habits.length;
    if (!total) return 0;
    const completed = currentUser.habits.reduce((acc, habit) => {
      return acc + ((habit.completedDates || []).includes(day) ? 1 : 0);
    }, 0);
    return { day, completed, total };
  });

  const totalDone = datesCompleted.reduce((acc, t) => acc + t.completed, 0);

  weeklyValue.textContent = totalDone;
  weeklyTotal.textContent = datesCompleted.reduce((acc, t) => acc + t.total, 0);

  datesCompleted.forEach((item) => {
    const dayBox = document.createElement('div');
    dayBox.className = 'week-day' + (item.completed > 0 ? ' completed' : '');
    const display = new Date(item.day).toLocaleDateString(undefined, { weekday: 'short' });
    dayBox.innerHTML = `<strong>${display}</strong><br>${item.completed}/${item.total}`;
    weekDays.appendChild(dayBox);
  });
}

function buildHabitItem(habit) {
  const li = document.createElement('li');
  li.className = 'habit-item';

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = habit.completed;
  checkbox.addEventListener('change', () => {
    const wasCompleted = habit.completed;
    habit.completed = checkbox.checked;

    const today = formatDate();
    habit.completedDates = habit.completedDates || [];

    if (habit.completed) {
      if (!habit.completedDates.includes(today)) {
        habit.completedDates.push(today);
      }
      // Trigger celebration effects when completing a habit
      if (!wasCompleted) {
        triggerHabitCompletionEffects(li);
      }
    } else {
      habit.completedDates = habit.completedDates.filter((date) => date !== today);
    }

    saveUsers();
    renderUI();
  });

  const name = document.createElement('span');
  name.className = 'habit-name' + (habit.completed ? ' completed' : '');
  name.textContent = habit.name;

  label.append(checkbox, name);

  const actions = document.createElement('div');
  actions.className = 'habit-actions';

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏️';
  editBtn.title = 'Edit habit';
  editBtn.addEventListener('click', () => {
    const newName = prompt('Edit habit name', habit.name);
    if (newName && newName.trim()) {
      habit.name = newName.trim();
      saveUsers();
      renderUI();
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.title = 'Delete habit';
  deleteBtn.addEventListener('click', () => {
    if (confirm(`Delete habit "${habit.name}"?`)) {
      currentUser.habits = currentUser.habits.filter((h) => h.id !== habit.id);
      saveUsers();
      renderUI();
    }
  });

  actions.append(editBtn, deleteBtn);
  li.append(label, actions);

  return li;
}

function renderHabits() {
  habitList.innerHTML = '';

  const habits = currentUser.habits || [];
  const today = formatDate();

  let filterSet = habits;
  if (currentFilter === 'completed') filterSet = habits.filter((h) => h.completed);
  if (currentFilter === 'pending') filterSet = habits.filter((h) => !h.completed);

  if (!filterSet.length) {
    const msg = document.createElement('p');
    msg.textContent = 'No habits found for this filter.';
    msg.style.color = '#64748b';
    habitList.appendChild(msg);
    return;
  }

  filterSet.forEach((habit) => {
    // Ensure each habit has completedDates array and today's burst tracking
    if (!Array.isArray(habit.completedDates)) habit.completedDates = [];
    if (habit.completed && !habit.completedDates.includes(today)) {
      habit.completedDates.push(today);
    }

    habitList.appendChild(buildHabitItem(habit));
  });
}

function renderUI() {
  todayDate.textContent = formatReadableDate();
  calculateProgress();
  calculateStreak();
  renderWeekHistory();
  renderHabits();
}

function addHabitHandler(e) {
  e.preventDefault();

  const name = habitNameInput.value.trim();
  if (!name) {
    return;
  }

  currentUser.habits = currentUser.habits || [];

  const newHabit = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name,
    completed: false,
    completedDates: []
  };

  currentUser.habits.push(newHabit);
  saveUsers();
  habitForm.reset();
  renderUI();
}

function setupFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      renderHabits();
    });
  });
}

function setupLogout() {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('habitHubIsLoggedIn');
    localStorage.removeItem('habitHubCurrentUser');
    window.location.href = 'index.html';
  });
}

function setupDarkMode() {
  const saved = localStorage.getItem('habitHubDarkMode');
  if (saved === 'true') document.body.classList.add('dark');

  darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const enabled = document.body.classList.contains('dark');
    localStorage.setItem('habitHubDarkMode', enabled.toString());
    darkModeBtn.textContent = enabled ? '☀️' : '🌙';
  });
}

// UI Enhancement Functions
function triggerHabitCompletionEffects(habitElement) {
  // Add completed class for green gradient background
  habitElement.classList.add('completed');

  // Show celebration emoji
  showCelebrationEmoji();

  // Trigger confetti effect
  createConfetti();
}

function showCelebrationEmoji() {
  const emojis = ['🎉', '😊', '💪', '🌟', '✨'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  const emojiElement = document.createElement('div');
  emojiElement.className = 'celebration-emoji';
  emojiElement.textContent = randomEmoji;
  document.body.appendChild(emojiElement);

  // Remove after animation
  setTimeout(() => {
    emojiElement.remove();
  }, 800);
}

function createConfetti() {
  const confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti';

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 3 + 's';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confettiContainer.appendChild(piece);
  }

  document.body.appendChild(confettiContainer);

  // Remove after animation
  setTimeout(() => {
    confettiContainer.remove();
  }, 3000);
}

function initDashboard() {
  if (!isLoggedIn || !currentUserEmail) return redirectToLogin();
  loadUser();

  if (!currentUser) return;

  setupFilters();
  setupLogout();
  setupDarkMode();

  habitForm.addEventListener('submit', addHabitHandler);

  renderUI();
}

initDashboard();
