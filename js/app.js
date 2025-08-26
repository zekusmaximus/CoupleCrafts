// Main Alpine.js Application for CoupleCrafts

function appStore() {
    return {
        // Settings
        aiEnabled: false,
        aiProvider: 'gemini',
        apiKey: '',

        // Filters
        currentCategory: '',
        showFavoritesOnly: false,
        categories: [
            '',
            'speculative fiction',
            'romantic bonding',
            'creative expression',
            'culinary adventure',
            'storytelling',
            'artistic creation',
            'mindful connection',
            'playful games'
        ],

        // Current activity
        currentActivity: {
            title: 'Welcome to CoupleCrafts!',
            description: 'Get AI-generated activity prompts or browse our curated collection of romantic activities.',
            instructions: [],
            supplies: [],
            cost: '',
            isFavorite: false,
            rating: 0
        },

        // Activities data
        activities: [],
        allActivities: [],
        fallbackActivities: [],
        currentActivityIndex: 0,

        // History data
        activityHistory: [],
        newEntry: {
            title: '',
            hisNotes: '',
            herNotes: '',
            photo: null,
            photoPreview: null
        },

        // Photo modal
        photoModal: {
            show: false,
            src: ''
        },

        // Export
        lastScrapbookExportDate: null,
        entriesToExport: [],

        // Shared UI state
        showAddEntry: false,
        showExportOptions: false,
        loading: false,

        // Initialize the store
        async init() {
            try {
                await window.coupleCraftsDB.init();
                await this.loadSettings();
                await this.loadFallbackActivities();
                await this.loadActivities();
                await this.loadHistory();
                this.lastScrapbookExportDate = await window.coupleCraftsDB.getSetting('lastScrapbookExportDate', null);
                if (this.activities.length > 0) {
                    this.currentActivity = this.activities[0];
                    this.currentActivityIndex = 0;
                } else if (this.fallbackActivities.length > 0) {
                    this.currentActivity = this.fallbackActivities[0];
                    this.currentActivityIndex = 0;
                }
            } catch (error) {
                console.error('Failed to initialize app:', error);
                await this.loadFallbackActivities();
                if (this.fallbackActivities.length > 0) {
                    this.currentActivity = this.fallbackActivities[0];
                }
            }
        },

        // Settings management
        async loadSettings() {
            try {
                this.aiEnabled = await window.coupleCraftsDB.getSetting('aiEnabled', false);
                this.aiProvider = await window.coupleCraftsDB.getSetting('aiProvider', 'gemini');
                if (!window.aiService.getProviderInfo(this.aiProvider)) {
                    this.aiProvider = 'gemini';
                    await window.coupleCraftsDB.saveSetting('aiProvider', this.aiProvider);
                }
                this.apiKey = await window.coupleCraftsDB.getSetting('apiKey', '');
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        },

        async saveSettings() {
            try {
                await window.coupleCraftsDB.saveSetting('aiEnabled', this.aiEnabled);
                await window.coupleCraftsDB.saveSetting('aiProvider', this.aiProvider);
                await window.coupleCraftsDB.saveSetting('apiKey', this.apiKey);
            } catch (error) {
                console.error('Failed to save settings:', error);
            }
        },

        async saveSettingsAndTest() {
            try {
                await this.saveSettings();
                if (this.aiEnabled && this.apiKey) {
                    const testResult = await window.aiService.testConnection(this.aiProvider, this.apiKey);
                    if (!testResult.success) throw new Error(testResult.message);
                    alert('API connection successful!');
                } else if (this.aiEnabled && !this.apiKey) {
                    alert('Enter an API key to test the connection.');
                } else {
                    alert('Settings saved. AI generation is disabled.');
                }
            } catch (error) {
                console.error('Failed to save settings:', error);
                alert(`Settings save failed: ${error.message}`);
            }
        },

        // Activity management
        async loadFallbackActivities() {
            try {
                const response = await fetch('data/fallback-activities.json');
                const data = await response.json();
                this.fallbackActivities = data.activities;
                console.log(`Loaded ${this.fallbackActivities.length} fallback activities`);
            } catch (error) {
                console.error('Failed to load fallback activities:', error);
                this.fallbackActivities = [{
                    title: 'Romantic Conversation',
                    description: 'Share your dreams and aspirations with each other.',
                    instructions: ['Find a comfortable spot', 'Take turns sharing your biggest dreams', 'Listen actively and ask questions'],
                    supplies: ['Comfortable seating'],
                    cost: '$0',
                    source: 'emergency-fallback'
                }];
            }
        },

        async loadActivities() {
            try {
                const savedActivities = await window.coupleCraftsDB.getActivities();
                const userActivities = await window.coupleCraftsDB.getUserActivities();
                this.allActivities = [...savedActivities, ...userActivities, ...this.fallbackActivities];
                this.applyFilters();
                console.log(`Loaded ${this.allActivities.length} total activities`);
            } catch (error) {
                console.error('Failed to load activities:', error);
                this.allActivities = [...this.fallbackActivities];
                this.applyFilters();
                alert('Failed to load saved activities. Showing fallback list.');
            }
        },

        applyFilters() {
            const category = (this.currentCategory || '').toLowerCase();
            this.activities = this.allActivities.filter(a => {
                const matchesCategory = !category || (a.category || '').toLowerCase() === category;
                const matchesFavorite = !this.showFavoritesOnly || !!a.isFavorite;
                return matchesCategory && matchesFavorite;
            });
            if (this.activities.length > 0) {
                this.currentActivityIndex = 0;
                this.currentActivity = this.activities[0];
            }
        },

        filterActivities() {
            this.applyFilters();
        },

        async getNewActivity() {
            if (this.aiEnabled && this.apiKey) {
                try {
                    this.loading = true;
                    const activity = await window.aiService.generateActivity(this.aiProvider, this.apiKey, this.currentCategory);
                    this.currentActivity = activity;
                    this.activities.unshift(activity);
                    await window.coupleCraftsDB.saveActivity(activity);
                    this.loading = false;
                } catch (error) {
                    console.error('AI generation failed:', error);
                    this.loading = false;
                    alert(error.message || 'Failed to generate activity');
                }
            } else {
                this.nextActivity();
            }
        },

        nextActivity() {
            if (this.activities.length > 0) {
                this.currentActivityIndex = (this.currentActivityIndex + 1) % this.activities.length;
                this.currentActivity = this.activities[this.currentActivityIndex];
            }
        },

        previousActivity() {
            if (this.activities.length > 0) {
                this.currentActivityIndex = this.currentActivityIndex > 0
                    ? this.currentActivityIndex - 1
                    : this.activities.length - 1;
                this.currentActivity = this.activities[this.currentActivityIndex];
            }
        },

        async toggleFavorite() {
            this.currentActivity.isFavorite = !this.currentActivity.isFavorite;
            if (this.currentActivity.id) {
                try {
                    await window.coupleCraftsDB.updateActivity(this.currentActivity.id, {
                        isFavorite: this.currentActivity.isFavorite
                    });
                } catch (error) {
                    console.error('Failed to update favorite status:', error);
                }
            }
        },

        async rateActivity() {
            const rating = prompt('Rate this activity (1-5 stars):');
            if (rating && rating >= 1 && rating <= 5) {
                this.currentActivity.rating = parseInt(rating);
                if (this.currentActivity.id) {
                    try {
                        await window.coupleCraftsDB.updateActivity(this.currentActivity.id, {
                            rating: this.currentActivity.rating
                        });
                    } catch (error) {
                        console.error('Failed to update rating:', error);
                    }
                }
            }
        },

        startActivity() {
            this.$root.activeTab = 'history';
            this.showAddEntry = true;
            this.newEntry.title = this.currentActivity.title;
        },

        // History management
        async loadHistory() {
            try {
                this.activityHistory = await window.coupleCraftsDB.getActivityHistory();
                for (let entry of this.activityHistory) {
                    if (entry.photoId) {
                        const photo = await window.coupleCraftsDB.getPhoto(entry.photoId);
                        if (photo) {
                            entry.photo = photo.url;
                        }
                    }
                }
                console.log(`Loaded ${this.activityHistory.length} history entries`);
            } catch (error) {
                console.error('Failed to load history:', error);
                this.activityHistory = [];
                alert('Failed to load history.');
            }
        },

        async handlePhotoUpload(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.newEntry.photo = file;
                this.newEntry.photoPreview = URL.createObjectURL(file);
            }
        },

        async saveEntry() {
            if (!this.newEntry.title.trim()) {
                alert('Please enter an activity title');
                return;
            }
            try {
                const entry = {
                    title: this.newEntry.title,
                    hisNotes: this.newEntry.hisNotes,
                    herNotes: this.newEntry.herNotes,
                    activityId: this.currentActivity.id || null,
                    date: new Date().toISOString()
                };
                const entryId = await window.coupleCraftsDB.saveActivityHistory(entry);
                entry.id = entryId;
                if (this.newEntry.photo) {
                    const photoId = await window.coupleCraftsDB.savePhoto(this.newEntry.photo, entryId);
                    entry.photoId = photoId;
                    entry.photo = URL.createObjectURL(this.newEntry.photo);
                }
                this.activityHistory.unshift(entry);
                this.newEntry = {
                    title: '',
                    hisNotes: '',
                    herNotes: '',
                    photo: null,
                    photoPreview: null
                };
                this.showAddEntry = false;
                alert('Activity saved successfully!');
            } catch (error) {
                console.error('Failed to save entry:', error);
                alert('Failed to save activity entry');
            }
        },

        async exportScrapbook(scope) {
            try {
                let entries = [...this.activityHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
                if (scope === 'since') {
                    if (this.lastScrapbookExportDate) {
                        const lastDate = new Date(this.lastScrapbookExportDate);
                        entries = entries.filter(e => new Date(e.date) > lastDate);
                    } else {
                        alert('This is your first scrapbook!');
                    }
                }
                if (entries.length === 0) {
                    alert('No entries to export.');
                    return;
                }
                this.entriesToExport = entries;
                const renderArea = document.getElementById('scrapbook-render-area');
                renderArea.classList.remove('hidden');
                const options = {
                    margin: 1,
                    filename: `CoupleCrafts_Scrapbook_${new Date().toISOString().slice(0,10)}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                await html2pdf().set(options).from(renderArea).save();
                renderArea.classList.add('hidden');
                this.entriesToExport = [];
                const now = new Date().toISOString();
                await window.coupleCraftsDB.saveSetting('lastScrapbookExportDate', now);
                this.lastScrapbookExportDate = now;
            } catch (error) {
                console.error('Scrapbook export failed:', error);
                alert('Failed to export scrapbook.');
            }
        },

        showPhotoModal(src) {
            this.photoModal.src = src;
            this.photoModal.show = true;
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };
}

function app() {
    return {
        activeTab: 'activities',
        showSettings: false,
        init() {
            this.$store.cc.init();
        }
    };
}

function settingsManager() {
    return {
        get aiEnabled() { return this.$store.cc.aiEnabled; },
        set aiEnabled(v) { this.$store.cc.aiEnabled = v; },
        get aiProvider() { return this.$store.cc.aiProvider; },
        set aiProvider(v) { this.$store.cc.aiProvider = v; },
        get apiKey() { return this.$store.cc.apiKey; },
        set apiKey(v) { this.$store.cc.apiKey = v; },
        saveSettingsAndTest() { this.$store.cc.saveSettingsAndTest(); }
    };
}

function activityViewer() {
    return {
        touchStartX: 0,
        get categories() { return this.$store.cc.categories; },
        get currentCategory() { return this.$store.cc.currentCategory; },
        set currentCategory(v) { this.$store.cc.currentCategory = v; },
        get showFavoritesOnly() { return this.$store.cc.showFavoritesOnly; },
        set showFavoritesOnly(v) { this.$store.cc.showFavoritesOnly = v; },
        get currentActivity() { return this.$store.cc.currentActivity; },
        filterActivities() { this.$store.cc.filterActivities(); },
        toggleFavorite() { this.$store.cc.toggleFavorite(); },
        getNewActivity() { this.$store.cc.getNewActivity(); },
        startActivity() { this.$store.cc.startActivity(); },
        rateActivity() { this.$store.cc.rateActivity(); },
        nextActivity() { this.$store.cc.nextActivity(); },
        previousActivity() { this.$store.cc.previousActivity(); },
        handleSwipe(endX) {
            const distance = endX - this.touchStartX;
            if (Math.abs(distance) > 50) {
                distance > 0 ? this.previousActivity() : this.nextActivity();
            }
        }
    };
}

function historyManager() {
    return {
        get activityHistory() { return this.$store.cc.activityHistory; },
        get newEntry() { return this.$store.cc.newEntry; },
        saveEntry() { this.$store.cc.saveEntry(); },
        handlePhotoUpload(e) { this.$store.cc.handlePhotoUpload(e); },
        formatDate(d) { return this.$store.cc.formatDate(d); },
        showPhotoModal(src) { this.$store.cc.showPhotoModal(src); }
    };
}

function scrapbookExporter() {
    return {
        exportAll() { this.$store.cc.exportScrapbook('all'); },
        exportSince() { this.$store.cc.exportScrapbook('since'); }
    };
}

document.addEventListener('alpine:init', () => {
    Alpine.store('cc', appStore());
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('CoupleCrafts PWA loaded');
});
