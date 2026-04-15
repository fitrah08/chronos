// ═══════════════════════════════════════════════════════════════
// CHRONOS • QUEST SYSTEM (FIXED)
// ═══════════════════════════════════════════════════════════════

const QUESTS = {
  // Cache lokal quest (diisi saat load dari API)
  _cache: null,

  DEFAULT_QUESTS: [
    { id: 'q1', quest_id: 'q1', name: 'Time Novice', description: 'Complete 5 focus sessions', target: 5, progress: 0, reward: 100, category: 'daily', claimed: false },
    { id: 'q2', quest_id: 'q2', name: 'Early Bird', description: 'Start 3 tasks before 9 AM', target: 3, progress: 0, reward: 150, category: 'daily', claimed: false },
    { id: 'q3', quest_id: 'q3', name: 'Limit Keeper', description: 'Stay within limits for all activities', target: 1, progress: 0, reward: 200, category: 'daily', claimed: false },
    { id: 'q4', quest_id: 'q4', name: 'Week Warrior', description: 'Maintain streak for 7 days', target: 7, progress: 0, reward: 500, category: 'weekly', claimed: false },
    { id: 'q5', quest_id: 'q5', name: 'Focus Master', description: 'Complete 10 hours of deep work', target: 600, progress: 0, reward: 300, category: 'weekly', claimed: false },
  ],

  // Ambil dari cache, fallback ke default
  getAll() {
    try {
      // Coba ambil dari cache atau localStorage
      if (this._cache && this._cache.length > 0) return this._cache;
      const cached = localStorage.getItem('chronos_quests_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._cache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error getting quests from cache:', e);
    }
    return this.DEFAULT_QUESTS;
  },

  getActiveQuests() {
    const quests = this.getAll();
    if (!Array.isArray(quests)) return [];
    return quests.filter(q => q && q.progress < q.target);
  },

  getCompletedCount() {
    const user = STORE.getCurrentUser();
    return user?.questsCompleted?.length || 0;
  },

  // Load quests dari API dan simpan ke cache
  async loadFromAPI() {
    try {
      const quests = await STORE.getQuests();
      if (quests && quests.length > 0) {
        this._cache = quests;
        STORE.saveQuests(quests);
        return quests;
      }
    } catch (e) {
      console.error('loadFromAPI error:', e);
    }
    return this.getAll();
  },

  updateProgress(type, amount) {
    const quests = this.getAll();
    let updated = false;

    quests.forEach(q => {
      if (q.progress >= q.target) return;

      if (type === 'focus' && (q.id === 'q1' || q.quest_id === 'q1')) {
        q.progress = Math.min(q.progress + 1, q.target);
        updated = true;
      }
      if (type === 'focus_time' && (q.id === 'q5' || q.quest_id === 'q5')) {
        q.progress = Math.min(q.progress + amount, q.target);
        updated = true;
      }
    });

    if (updated) {
      this._cache = quests;
      STORE.saveQuests(quests);
    }
  },

  // FIX: async, pakai STORE.claimQuest() (API) — bukan manipulasi localStorage users
  async claimReward(questId) {
    const quests = this.getAll();
    const quest = quests.find(q => q.id === questId || q.quest_id === questId);

    if (!quest || quest.progress < quest.target) {
      console.warn('Quest not ready to claim:', questId);
      return null;
    }

    // Panggil API untuk claim
    const data = await STORE.claimQuest(questId);

    if (data && data.success) {
      // Update cache lokal
      quest.claimed = true;
      this._cache = quests;
      STORE.saveQuests(quests);
      return { reward: data.reward };
    }

    return null;
  }
};
