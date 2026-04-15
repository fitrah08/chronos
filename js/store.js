// ═══════════════════════════════════════════════════════════════
// CHRONOS • STORE MANAGER (FIXED)
// ═══════════════════════════════════════════════════════════════

const API_BASE = 'http://chronos.test/api';

const STORE = {
  currentUser: null,
  _initPromise: null, // ← FIX: prevent race condition on double init

  async init() {
    // Kalau sudah/sedang init, return promise yang sama (jangan fetch ulang)
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth.php?action=session`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          this.currentUser = data.user;
          console.log('✅ Session loaded:', this.currentUser?.username);
        } else {
          console.log('No active session');
        }
      } catch (error) {
        console.log('No active session');
      }
    })();

    return this._initPromise;
  },

  async login(username, password) {
    try {
      console.log('📡 Login:', username);
      const response = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      console.log('📦 API Response:', data.success ? 'SUCCESS' : 'FAILED');

      if (data.success) {
        this.currentUser = data.user;
        // Reset init promise agar session fresh di halaman berikutnya
        this._initPromise = null;
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  async register(userData) {
    try {
      const response = await fetch(`${API_BASE}/auth.php?action=register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth.php?action=logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {}
    this.currentUser = null;
    this._initPromise = null;
    window.location.replace('index.html');
  },

  getCurrentUser() {
    return this.currentUser;
  },

  async updateProfile(updates) {
    try {
      const response = await fetch(`${API_BASE}/users.php?action=updateProfile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        // Update local currentUser
        if (updates.fullName) this.currentUser.fullName = updates.fullName;
        if (updates.email !== undefined) this.currentUser.email = updates.email;
        if (updates.phone !== undefined) this.currentUser.phone = updates.phone;
        // FIX: gunakan 'photoURL' in updates (bukan undefined check) agar null juga diproses
        if ('photoURL' in updates) this.currentUser.photoURL = updates.photoURL;
        return true;
      }
      return false;
    } catch (error) {
      console.error('updateProfile error:', error);
      return false;
    }
  },

  async getAllUsers() {
    try {
      const response = await fetch(`${API_BASE}/users.php`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    } catch (error) {
      return { users: [] };
    }
  },

  async updateUser(userData) {
    try {
      const response = await fetch(`${API_BASE}/users.php`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async deleteUser(id) {
    try {
      const response = await fetch(`${API_BASE}/users.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async getQuests() {
    try {
      const response = await fetch(`${API_BASE}/quests.php`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data.quests) ? data.quests : [];
      }
      return [];
    } catch (error) {
      console.error('Get quests error:', error);
      return [];
    }
  },

  saveQuests(quests) {
    // Cache lokal sementara (data asli di MySQL)
    localStorage.setItem('chronos_quests_cache', JSON.stringify(quests));
  },

  async claimQuest(questId) {
    try {
      const response = await fetch(`${API_BASE}/quests.php?action=claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await response.json();
      if (data.success && this.currentUser) {
        this.currentUser.xp = (this.currentUser.xp || 0) + data.reward;
        const levelInfo = this.calculateLevel(this.currentUser.xp);
        this.currentUser.level = levelInfo.level;
      }
      return data;
    } catch (error) {
      return { success: false };
    }
  },

  LEVELS: [
    { level: 1, xpRequired: 0, title: 'Time Beginner' },
    { level: 2, xpRequired: 100, title: 'Time Beginner' },
    { level: 3, xpRequired: 250, title: 'Focus Apprentice' },
    { level: 5, xpRequired: 700, title: 'Productivity Adept' },
    { level: 10, xpRequired: 3200, title: 'Focus Sage' },
    { level: 20, xpRequired: 8000, title: 'Time Lord' },
    { level: 50, xpRequired: 30000, title: 'Chronos Legend' },
  ],

  calculateLevel(xp) {
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVELS[i].xpRequired) return this.LEVELS[i];
    }
    return this.LEVELS[0];
  },

  getNextLevel(xp) {
    for (let i = 0; i < this.LEVELS.length; i++) {
      if (this.LEVELS[i].xpRequired > xp) return this.LEVELS[i];
    }
    return null;
  },

  addXP(amount) {
    if (!this.currentUser) return null;
    this.currentUser.xp = (this.currentUser.xp || 0) + amount;
    const levelInfo = this.calculateLevel(this.currentUser.xp);
    this.currentUser.level = levelInfo.level;
    return { newLevel: levelInfo.level };
  },

  getActivities() {
    const user = this.getCurrentUser();
    if (!user) return [];
    const key = `chronos_activities_${user.id}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  saveActivities(activities) {
    const user = this.getCurrentUser();
    if (!user) return;
    const key = `chronos_activities_${user.id}`;
    localStorage.setItem(key, JSON.stringify(activities));
  },

  updateUserSettings(settings) {
    const user = this.getCurrentUser();
    if (!user) return;
    if (!user.settings) user.settings = {};
    Object.assign(user.settings, settings);
    // FIX: persist settings ke server agar theme/accent tersimpan lintas halaman
    this._persistSettings(user.settings);
  },

  // Simpan settings ke server (fire-and-forget)
  async _persistSettings(newSettings) {
    try {
      await fetch(`${API_BASE}/users.php?action=updateProfile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: JSON.stringify(newSettings) })
      });
    } catch (e) {
      // Gagal simpan settings — tidak fatal
    }
  }
};
// TIDAK auto-init di sini — biar setiap halaman yang panggil sendiri via await STORE.init()
