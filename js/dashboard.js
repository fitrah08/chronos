// ═══════════════════════════════════════════════════════════════
// CHRONOS • DASHBOARD LOGIC (FIXED)
// ═══════════════════════════════════════════════════════════════

// State
let activities = [];
let sessions = [];
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerTotalSeconds = 25 * 60;
let editingActivityId = null;
let currentUser = null;

// Default activities
const DEFAULT_ACTIVITIES = [
  { id: 1, name: 'Deep Work', category: 'work', color: '#4f8fff', duration: 90, limit: 270, timeUsed: 0, icon: '💼' },
  { id: 2, name: 'Exercise', category: 'health', color: '#3dd68c', duration: 45, limit: 60, timeUsed: 0, icon: '🏃' },
  { id: 3, name: 'Reading', category: 'personal', color: '#7b6fff', duration: 30, limit: 90, timeUsed: 0, icon: '📚' },
];

// ========== INIT (ASYNC) ==========
// FIX: satu-satunya fungsi init, async, pakai await STORE.init()
async function initDashboard() {
  console.log('🚀 Dashboard initializing...');

  await STORE.init();

  currentUser = STORE.getCurrentUser();
  console.log('🔍 Dashboard - currentUser:', currentUser);

  if (!currentUser) {
    console.log('❌ No user, redirecting to login');
    window.location.replace('index.html');
    return;
  }

  // Load activities
  const savedActivities = STORE.getActivities();
  activities = savedActivities.length > 0 ? savedActivities : DEFAULT_ACTIVITIES;
  if (savedActivities.length === 0) {
    STORE.saveActivities(activities);
  }

  // Update UI
  if (currentUser.fullName) {
    document.getElementById('userName').textContent = currentUser.fullName.split(' ')[0];
    updateSidebarAvatar();
    document.getElementById('userLevel').textContent = `⚡ Level ${currentUser.level || 1}`;
  }

  loadSettings();
  updateXPDisplay();
  updateQuestsDisplay();
  renderDashboard();

  const now = new Date();
  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    dateDisplay.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning ☀️' : hour < 17 ? 'Good afternoon 🌤' : 'Good evening 🌙';
  const greetingTitle = document.getElementById('greeting-title');
  if (greetingTitle) greetingTitle.textContent = greeting;

  if (window.innerWidth < 768) {
    const topbar = document.getElementById('topbar');
    if (topbar) topbar.style.display = 'flex';
  }

  console.log('✅ Dashboard ready!');
}

// Update sidebar avatar dengan foto profil
function updateSidebarAvatar() {
  const avatar = document.getElementById('userAvatar');
  const user = STORE.getCurrentUser();
  if (!avatar || !user) return;

  if (user.photoURL) {
    avatar.innerHTML = '';
    const img = document.createElement('img');
    img.src = user.photoURL;
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover';
    avatar.appendChild(img);
  } else {
    avatar.textContent = (user.fullName || 'U').charAt(0).toUpperCase();
  }
}

// ========== SETTINGS ==========
function loadSettings() {
  const settings = currentUser.settings || { theme: 'dark', accentColor: '#4f8fff', animations: true };

  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  document.documentElement.style.setProperty('--accent', settings.accentColor || '#4f8fff');
  document.documentElement.style.setProperty('--accent2', settings.accentColor || '#4f8fff');
  document.documentElement.setAttribute('data-animations', settings.animations !== false);

  const animToggle = document.getElementById('animationsToggle');
  if (animToggle) animToggle.checked = settings.animations !== false;

  updateThemeButtons(settings.theme || 'dark');
}

function updateThemeButtons(theme) {
  document.querySelectorAll('[onclick*="setTheme"]').forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (onclick.includes("'dark'") || onclick.includes('"dark"')) {
      btn.className = theme === 'dark' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
    } else if (onclick.includes("'light'") || onclick.includes('"light"')) {
      btn.className = theme === 'light' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm';
    }
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeButtons(theme);
  const settings = { ...currentUser.settings, theme };
  STORE.updateUserSettings(settings);
  currentUser.settings = settings;
  showNotif('Theme Updated', `Switched to ${theme} mode`, 'success');
}

function setAccentColor(color, el) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent2', color);
  document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
  // FIX: pakai parameter el, bukan global event (tidak reliable)
  const target = el || (typeof event !== 'undefined' && event.target);
  if (target) target.classList.add('active');
  const settings = { ...currentUser.settings, accentColor: color };
  STORE.updateUserSettings(settings);
  currentUser.settings = settings;
  showNotif('Color Updated', 'Accent color changed', 'success');
}

function toggleAnimations(enabled) {
  document.documentElement.setAttribute('data-animations', enabled);
  const settings = { ...currentUser.settings, animations: enabled };
  STORE.updateUserSettings(settings);
  currentUser.settings = settings;
  showNotif('Animations', enabled ? 'Animations enabled' : 'Animations disabled', 'success');
}

function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
}

// ========== XP & QUESTS ==========
function updateXPDisplay() {
  if (!currentUser) return;
  const levelInfo = STORE.calculateLevel(currentUser.xp || 0);
  const nextLevel = STORE.getNextLevel(currentUser.xp || 0);

  const levelEl = document.getElementById('userLevelDisplay');
  if (levelEl) levelEl.textContent = levelInfo.level;

  let xpProgress = 0;
  let xpInfo = `${currentUser.xp || 0} XP`;
  if (nextLevel) {
    const xpForCurrent = levelInfo.xpRequired;
    const xpForNext = nextLevel.xpRequired;
    const xpInLevel = (currentUser.xp || 0) - xpForCurrent;
    const xpNeeded = xpForNext - xpForCurrent;
    xpProgress = (xpInLevel / xpNeeded) * 100;
    xpInfo = `${xpInLevel} / ${xpNeeded} XP`;
  }

  const xpFill = document.getElementById('xpFill');
  const xpInfoEl = document.getElementById('xpInfo');
  if (xpFill) xpFill.style.width = xpProgress + '%';
  if (xpInfoEl) xpInfoEl.textContent = xpInfo;
}

function updateQuestsDisplay() {
  try {
    const quests = QUESTS.getActiveQuests();
    const completed = QUESTS.getCompletedCount();
    const questsCompletedEl = document.getElementById('questsCompleted');
    const questsAvailableEl = document.getElementById('questsAvailable');
    if (questsCompletedEl) questsCompletedEl.textContent = completed;
    if (questsAvailableEl) questsAvailableEl.textContent = (quests.length || 0) + ' available';
  } catch (e) {
    console.error('Error updating quests display:', e);
  }
}

// ========== RENDER ==========
function renderDashboard() {
  const list = document.getElementById('activity-list');
  if (!list) return;

  if (activities.length === 0) {
    list.innerHTML = '<div style="color:var(--text3);text-align:center;padding:20px">No activities yet. Add one!</div>';
  } else {
    list.innerHTML = activities.slice(0, 5).map(a => {
      const p = a.limit ? Math.min(100, Math.round((a.timeUsed || 0) / a.limit * 100)) : 0;
      return `<div class="activity-item" onclick="startTimerFor(${a.id})">
        <div class="activity-dot" style="background:${a.color}"></div>
        <div class="activity-info">
          <div class="activity-name">${a.icon || '📌'} ${a.name}</div>
          <div class="activity-meta">${a.timeUsed || 0}m / ${a.limit}m</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${p}%;background:${a.color}"></div></div>
        </div>
        <div class="activity-time">${Math.floor((a.timeUsed || 0) / 60)}h${(a.timeUsed || 0) % 60}m</div>
      </div>`;
    }).join('');
  }

  const questPreview = document.getElementById('quest-preview');
  if (questPreview) {
    try {
      const activeQuests = QUESTS.getActiveQuests().slice(0, 3);
      if (activeQuests.length === 0) {
        questPreview.innerHTML = '<div style="color:var(--text3);text-align:center;padding:20px">All quests completed! 🎉</div>';
      } else {
        questPreview.innerHTML = activeQuests.map(q => {
          const progress = (q.progress / q.target) * 100;
          return `<div class="quest-card">
            <div class="quest-header">
              <span class="quest-name">${q.name}</span>
              <span class="quest-reward">+${q.reward} XP</span>
            </div>
            <div class="quest-desc">${q.description}</div>
            <div class="quest-progress">
              <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:var(--accent)"></div></div>
              <span>${q.progress}/${q.target}</span>
            </div>
          </div>`;
        }).join('');
      }
    } catch (e) {
      console.error('Error rendering quest preview:', e);
      questPreview.innerHTML = '<div style="color:var(--text3);text-align:center;padding:20px">Loading quests...</div>';
    }
  }

  const totalFocus = activities.reduce((sum, a) => sum + (a.timeUsed || 0), 0);
  const totalFocusEl = document.getElementById('totalFocus');
  if (totalFocusEl) totalFocusEl.textContent = Math.floor(totalFocus / 60) + 'h ' + (totalFocus % 60) + 'm';
}

function renderQuestsPage() {
  const container = document.getElementById('quests-list');
  if (!container) return;
  const allQuests = QUESTS.getAll();

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="section-title">Daily Quests</div>
        ${allQuests.filter(q => q.category === 'daily').map(q => renderQuestCard(q)).join('')}
      </div>
      <div class="card">
        <div class="section-title">Weekly Quests</div>
        ${allQuests.filter(q => q.category === 'weekly').map(q => renderQuestCard(q)).join('')}
      </div>
    </div>
  `;
}

function renderQuestCard(quest) {
  const isCompleted = quest.progress >= quest.target;
  const isClaimed = quest.claimed == 1 || quest.claimed === true;
  const progress = Math.min(100, (quest.progress / quest.target) * 100);
  const questId = quest.quest_id || quest.id;

  return `<div class="quest-card">
    <div class="quest-header">
      <span class="quest-name">${isCompleted ? '✅' : '⚔️'} ${quest.name}</span>
      <span class="quest-reward">+${quest.reward} XP</span>
    </div>
    <div class="quest-desc">${quest.description}</div>
    <div class="quest-progress">
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:${isCompleted ? 'var(--success)' : 'var(--accent)'}"></div></div>
      <span>${quest.progress}/${quest.target}</span>
    </div>
    ${isCompleted && !isClaimed ? `<button class="btn btn-sm btn-primary" style="margin-top:10px;width:100%;" onclick="claimQuest('${questId}')">Claim Reward</button>` : ''}
    ${isClaimed ? `<div style="text-align:center;margin-top:8px;font-size:12px;color:var(--success)">✓ Claimed</div>` : ''}
  </div>`;
}

function renderActivitiesPage() {
  const grid = document.getElementById('activities-grid');
  if (!grid) return;

  if (activities.length === 0) {
    grid.innerHTML = '<div class="card" style="text-align:center;color:var(--text3);padding:40px">No activities yet. Click "New Activity" to add one.</div>';
    return;
  }

  grid.innerHTML = activities.map(a => {
    const p = a.limit ? Math.min(100, Math.round((a.timeUsed || 0) / a.limit * 100)) : 0;
    return `<div class="card" style="display:flex;align-items:center;gap:16px;padding:16px 20px">
      <div style="width:40px;height:40px;border-radius:10px;background:${a.color}22;border:1px solid ${a.color}44;display:flex;align-items:center;justify-content:center;font-size:18px">${a.icon || '📌'}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:15px;font-weight:700">${a.name}</span>
          <span style="background:${a.color}22;color:${a.color};font-size:11px;padding:2px 8px;border-radius:20px">${a.category}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">Limit: ${a.limit}m · Used: ${a.timeUsed || 0}m</div>
        <div class="progress-bar" style="height:3px"><div class="progress-fill" style="width:${p}%;background:${a.color}"></div></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="editActivity(${a.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteActivity(${a.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ========== NAVIGATION ==========
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  const btn = document.querySelector(`.nav-item[onclick*="${page}"]`);
  if (btn) btn.classList.add('active');

  if (page === 'quests') renderQuestsPage();
  if (page === 'activities') renderActivitiesPage();
  if (page === 'timer') renderTimerPage();
  if (page === 'dashboard') renderDashboard();

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

// ========== TIMER ==========
function renderTimerPage() {
  const sel = document.getElementById('timer-activity');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Activity...</option>' +
    activities.map(a => `<option value="${a.id}">${a.icon || '📌'} ${a.name}</option>`).join('');
}

function setTimerPreset(min) {
  if (timerRunning) { clearInterval(timerInterval); timerRunning = false; }
  timerSeconds = min * 60;
  timerTotalSeconds = min * 60;
  document.getElementById('timer-btn').textContent = '▶ Start';
  document.getElementById('timer-status').textContent = 'Ready';
  updateTimerDisplay();
}

function toggleTimer() {
  const actId = parseInt(document.getElementById('timer-activity').value);
  if (!actId) {
    showNotif('Select Activity', 'Please select an activity first', 'warn');
    return;
  }

  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timer-btn').textContent = '▶ Start';
    document.getElementById('timer-status').textContent = 'Paused';
    const elapsed = (timerTotalSeconds - timerSeconds) / 60;
    if (elapsed > 0.5) logSession(actId, elapsed);
  } else {
    timerRunning = true;
    document.getElementById('timer-btn').textContent = '⏸ Pause';
    document.getElementById('timer-status').textContent = 'Running...';
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timer-btn').textContent = '▶ Start';
        document.getElementById('timer-status').textContent = 'Complete! ✓';
        logSession(actId, timerTotalSeconds / 60);
        showNotif('Timer Complete!', 'Great work! +50 XP', 'success');
        STORE.addXP(50);
        updateXPDisplay();
        QUESTS.updateProgress('focus', timerTotalSeconds / 60);
        updateQuestsDisplay();
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerTotalSeconds;
  document.getElementById('timer-btn').textContent = '▶ Start';
  document.getElementById('timer-status').textContent = 'Ready';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const el = document.getElementById('timer-display');
  if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function logSession(actId, mins) {
  const act = activities.find(a => a.id === actId);
  if (!act || mins < 0.5) return;

  act.timeUsed = Math.round((act.timeUsed || 0) + mins);
  STORE.saveActivities(activities);

  sessions.push({ name: act.name, mins: Math.round(mins), time: new Date().toLocaleTimeString() });

  const sessionLog = document.getElementById('session-log');
  if (sessionLog) {
    sessionLog.innerHTML = sessions.slice(-5).reverse().map(s => `
      <div style="padding:10px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between">
          <span>${s.name}</span>
          <span style="color:var(--accent)">${s.mins}m</span>
        </div>
        <div style="font-size:11px;color:var(--text3)">${s.time}</div>
      </div>
    `).join('');
  }

  renderDashboard();
}

function startTimerFor(id) {
  navigate('timer');
  setTimeout(() => {
    const sel = document.getElementById('timer-activity');
    if (sel) sel.value = id;
  }, 100);
}

// ========== ACTIVITY CRUD ==========
function openAddActivity() {
  editingActivityId = null;
  document.getElementById('modalTitle').textContent = 'Add Activity';
  document.getElementById('activityName').value = '';
  document.getElementById('activityLimit').value = '90';
  document.getElementById('activityCategory').value = 'work';
  document.getElementById('addActivityModal').classList.add('active');
}

function editActivity(id) {
  const act = activities.find(a => a.id === id);
  if (!act) return;
  editingActivityId = id;
  document.getElementById('modalTitle').textContent = 'Edit Activity';
  document.getElementById('activityName').value = act.name;
  document.getElementById('activityLimit').value = act.limit;
  document.getElementById('activityCategory').value = act.category;
  document.getElementById('addActivityModal').classList.add('active');
}

function saveActivity() {
  const name = document.getElementById('activityName').value.trim();
  if (!name) {
    showNotif('Error', 'Please enter activity name', 'danger');
    return;
  }

  const category = document.getElementById('activityCategory').value;
  const colors = { work: '#4f8fff', health: '#3dd68c', leisure: '#ff6b9d', personal: '#7b6fff' };
  const icons = { work: '💼', health: '🏃', leisure: '🎮', personal: '🧘' };

  const data = {
    name,
    category,
    limit: parseInt(document.getElementById('activityLimit').value) || 90,
    color: colors[category],
    icon: icons[category],
    duration: 60,
    timeUsed: 0
  };

  if (editingActivityId) {
    const index = activities.findIndex(a => a.id === editingActivityId);
    if (index !== -1) activities[index] = { ...activities[index], ...data };
    showNotif('Updated', `${name} updated`, 'success');
  } else {
    activities.push({ id: Date.now(), ...data });
    showNotif('Added', `${name} added`, 'success');
  }

  STORE.saveActivities(activities);
  closeModal('addActivityModal');
  renderDashboard();
  renderActivitiesPage();
}

function deleteActivity(id) {
  if (!confirm('Delete this activity?')) return;
  activities = activities.filter(a => a.id !== id);
  STORE.saveActivities(activities);
  renderDashboard();
  renderActivitiesPage();
  showNotif('Deleted', 'Activity removed', 'warn');
}

// ========== QUESTS ==========
// FIX: async karena QUESTS.claimReward sekarang panggil API
async function claimQuest(questId) {
  const result = await QUESTS.claimReward(questId);
  if (result) {
    showNotif('Quest Completed!', `+${result.reward} XP earned!`, 'success');
    // Update currentUser dari store
    currentUser = STORE.getCurrentUser();
    updateXPDisplay();
    updateQuestsDisplay();
    renderQuestsPage();
    renderDashboard();
  } else {
    showNotif('Error', 'Failed to claim quest', 'danger');
  }
}

// ========== UTILITY ==========
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function showNotif(title, msg, type = 'info') {
  const container = document.getElementById('notifContainer');
  if (!container) return;
  const colors = { success: 'var(--success)', warn: 'var(--warn)', danger: 'var(--danger)', info: 'var(--accent)' };
  const icons = { success: '✓', warn: '!', danger: '✕', info: '✦' };

  const div = document.createElement('div');
  div.className = 'notif-item';
  div.innerHTML = `<div class="notif-title" style="color:${colors[type]}">${icons[type]} ${title}</div>
    <div style="color:var(--text2)">${msg}</div>`;
  container.appendChild(div);

  setTimeout(() => div.classList.add('show'), 10);
  setTimeout(() => {
    div.classList.remove('show');
    setTimeout(() => div.remove(), 400);
  }, 4000);
}

function logout() {
  STORE.logout();
}

// ========== EVENT LISTENERS ==========
// FIX: panggil initDashboard (async), bukan init() yang lama
window.addEventListener('DOMContentLoaded', initDashboard);

window.addEventListener('resize', () => {
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.style.display = window.innerWidth < 768 ? 'flex' : 'none';
});
