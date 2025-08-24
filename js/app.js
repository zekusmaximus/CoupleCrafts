// Main Alpine.js Application for CoupleCrafts
function app() {
    return {
        // App state
        activeTab: 'activities',
        showSettings: false,
        showAddEntry: false,
        showExportOptions: false,
        loading: false,
        
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
        activities: [], // filtered list for display
        allActivities: [], // unfiltered master list
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

        lastScrapbookExportDate: null,

        // Initialize the app
        async init() {
            try {
                // Initialize database
                await window.coupleCraftsDB.init();
                console.log('Database initialized');
                
                // Load settings
                await this.loadSettings();
                
                // Load fallback activities
                await this.loadFallbackActivities();
                
                // Load saved activities and history
                await this.loadActivities();
                await this.loadHistory();

                this.lastScrapbookExportDate = await window.coupleCraftsDB.getSetting('lastScrapbookExportDate', null);
                
                // Set initial activity from filtered list or fallback
                if (this.activities.length > 0) {
                    this.currentActivity = this.activities[0];
                    this.currentActivityIndex = 0;
                } else if (this.fallbackActivities.length > 0) {
                    this.currentActivity = this.fallbackActivities[0];
                    this.currentActivityIndex = 0;
                }
                
                console.log('App initialized successfully');
            } catch (error) {
                console.error('Failed to initialize app:', error);
                // Continue with fallback data
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

        // Explicit save + test action to avoid testing on every keystroke
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
                const response = await fetch('/data/fallback-activities.json');
                const data = await response.json();
                this.fallbackActivities = data.activities;
                console.log(`Loaded ${this.fallbackActivities.length} fallback activities`);
            } catch (error) {
                console.error('Failed to load fallback activities:', error);
                // Create minimal fallback if file fails to load
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
            // Reset index and current activity if needed
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
                await this.generateAIActivity();
            } else {
                this.getRandomFallbackActivity();
            }
        },

        async generateAIActivity() {
            this.loading = true;
            try {
                const activity = await window.aiService.generateActivity(
                    this.aiProvider, 
                    this.apiKey
                );
                
                // Save to database
                await window.coupleCraftsDB.saveActivity(activity);
                
                // Update current activity
                this.currentActivity = activity;
                
                // Add to activities list
                this.allActivities.unshift(activity);
                this.applyFilters();
                
                console.log('Generated new AI activity:', activity.title);
            } catch (error) {
                console.error('AI generation failed:', error);
                const msg = (error && error.message) ? error.message : '';
                if (/401|403/i.test(msg)) {
                    alert('AI request failed: Invalid API key or insufficient permissions. Check your key and provider.');
                } else if (/429|rate|quota/i.test(msg)) {
                    alert('AI request failed: Rate limit or quota exceeded. Please try again later.');
                } else {
                    alert('Failed to generate AI activity. Using fallback activity instead.');
                }
                this.getRandomFallbackActivity();
            } finally {
                this.loading = false;
            }
        },

        getRandomFallbackActivity() {
            if (this.fallbackActivities.length > 0) {
                const randomIndex = Math.floor(Math.random() * this.fallbackActivities.length);
                this.currentActivity = this.fallbackActivities[randomIndex];
                this.currentActivityIndex = randomIndex;
            }
        },

        // Navigation
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

        // Activity interactions
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
            // Switch to history tab and prepare for entry
            this.activeTab = 'history';
            this.showAddEntry = true;
            this.newEntry.title = this.currentActivity.title;
        },

        // History management
        async loadHistory() {
            try {
                this.activityHistory = await window.coupleCraftsDB.getActivityHistory();
                
                // Load photos for each history entry
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

                // Save entry to database
                const entryId = await window.coupleCraftsDB.saveActivityHistory(entry);
                entry.id = entryId;

                // Save photo if provided
                if (this.newEntry.photo) {
                    const photoId = await window.coupleCraftsDB.savePhoto(this.newEntry.photo, entryId);
                    entry.photoId = photoId;
                    entry.photo = URL.createObjectURL(this.newEntry.photo);
                }

                // Add to history list
                this.activityHistory.unshift(entry);

                // Reset form
                this.newEntry = {
                    title: '',
                    hisNotes: '',
                    herNotes: '',
                    photo: null,
                    photoPreview: null
                };
                this.showAddEntry = false;

                console.log('Activity entry saved successfully');
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

                const template = document.getElementById('scrapbook-template');
                template.innerHTML = '';

                const cover = document.createElement('div');
                cover.className = 'min-h-screen flex flex-col justify-center items-center text-center p-8 bg-gradient-to-r from-pink-100 to-blue-100';
                const title = document.createElement('h1');
                title.className = 'text-3xl font-bold mb-4 text-pink-600';
                title.textContent = 'Our CoupleCrafts Memories';
                const dateEl = document.createElement('p');
                dateEl.className = 'text-lg text-gray-700';
                dateEl.textContent = new Date().toLocaleDateString();
                cover.appendChild(title);
                cover.appendChild(dateEl);
                template.appendChild(cover);

                entries.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.className = 'my-4 p-6 bg-gradient-to-r from-pink-100 to-blue-100 border-2 border-pink-300 rounded-lg shadow-md';
                    const header = document.createElement('div');
                    header.className = 'text-center font-bold mb-2';
                    header.textContent = `${entry.title} - ${this.formatDate(entry.date)}`;
                    entryDiv.appendChild(header);

                    if (entry.photo) {
                        const img = document.createElement('img');
                        img.src = entry.photo;
                        img.className = 'max-w-md h-auto mx-auto my-4 rounded';
                        entryDiv.appendChild(img);
                    }

                    const notes = document.createElement('div');
                    notes.className = 'grid grid-cols-2 gap-4 text-sm';
                    const his = document.createElement('div');
                    const hisLabel = document.createElement('h4');
                    hisLabel.className = 'font-semibold text-blue-600 mb-1';
                    hisLabel.textContent = 'His Thoughts 💙';
                    const hisText = document.createElement('p');
                    hisText.textContent = entry.hisNotes || '';
                    his.appendChild(hisLabel);
                    his.appendChild(hisText);
                    const her = document.createElement('div');
                    const herLabel = document.createElement('h4');
                    herLabel.className = 'font-semibold text-pink-600 mb-1';
                    herLabel.textContent = 'Her Thoughts 💖';
                    const herText = document.createElement('p');
                    herText.textContent = entry.herNotes || '';
                    her.appendChild(herLabel);
                    her.appendChild(herText);
                    notes.appendChild(his);
                    notes.appendChild(her);
                    entryDiv.appendChild(notes);
                    template.appendChild(entryDiv);
                });

                template.classList.remove('hidden');

                const options = {
                    margin: 1,
                    filename: `CoupleCrafts_Scrapbook_${new Date().toISOString().slice(0,10)}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                await html2pdf().set(options).from(template).save();

                template.classList.add('hidden');
                template.innerHTML = '';

                const now = new Date().toISOString();
                await window.coupleCraftsDB.saveSetting('lastScrapbookExportDate', now);
                this.lastScrapbookExportDate = now;
            } catch (error) {
                console.error('Scrapbook export failed:', error);
                alert('Failed to export scrapbook.');
            }
        },

        // Photo modal
        showPhotoModal(src) {
            this.photoModal.src = src;
            this.photoModal.show = true;
        },

        // Utility functions
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        },

        // Watch for settings changes
        $watch: {
            aiEnabled() {
                this.saveSettings();
            },
            aiProvider() {
                this.saveSettings();
            },
            apiKey() {
                this.saveSettings();
            }
        }
    };
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('CoupleCrafts PWA loaded');
});

// Handle touch gestures for swipe navigation
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
        const appElement = document.querySelector('#app');
        if (appElement && appElement.__x) {
            const appData = appElement.__x.$data;
            
            if (appData.activeTab === 'activities') {
                if (swipeDistance > 0) {
                    appData.previousActivity();
                } else {
                    appData.nextActivity();
                }
            }
        }
    }
}

