// IndexedDB Database Management for CoupleCrafts
class CoupleCraftsDB {
    constructor() {
        this.dbName = 'CoupleCraftsDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                console.log('Database upgrade needed');

                // Activities store
                if (!this.db.objectStoreNames.contains('activities')) {
                    const activitiesStore = this.db.createObjectStore('activities', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    activitiesStore.createIndex('title', 'title', { unique: false });
                    activitiesStore.createIndex('category', 'category', { unique: false });
                    activitiesStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                    activitiesStore.createIndex('rating', 'rating', { unique: false });
                    activitiesStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                }

                // Activity history store
                if (!this.db.objectStoreNames.contains('activityHistory')) {
                    const historyStore = this.db.createObjectStore('activityHistory', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    historyStore.createIndex('date', 'date', { unique: false });
                    historyStore.createIndex('activityId', 'activityId', { unique: false });
                }

                // Photos store (for storing photo blobs)
                if (!this.db.objectStoreNames.contains('photos')) {
                    const photosStore = this.db.createObjectStore('photos', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    photosStore.createIndex('historyId', 'historyId', { unique: false });
                    photosStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                }

                // Settings store
                if (!this.db.objectStoreNames.contains('settings')) {
                    const settingsStore = this.db.createObjectStore('settings', {
                        keyPath: 'key'
                    });
                }

                // User-added activities store
                if (!this.db.objectStoreNames.contains('userActivities')) {
                    const userActivitiesStore = this.db.createObjectStore('userActivities', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    userActivitiesStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                }
            };
        });
    }

    // Activity management
    async saveActivity(activity) {
        const transaction = this.db.transaction(['activities'], 'readwrite');
        const store = transaction.objectStore('activities');
        
        const activityData = {
            ...activity,
            dateAdded: new Date().toISOString(),
            isFavorite: activity.isFavorite || false,
            rating: activity.rating || 0
        };

        return new Promise((resolve, reject) => {
            const request = store.add(activityData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getActivities(limit = 50) {
        const transaction = this.db.transaction(['activities'], 'readonly');
        const store = transaction.objectStore('activities');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const activities = request.result.slice(-limit);
                resolve(activities);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateActivity(id, updates) {
        const transaction = this.db.transaction(['activities'], 'readwrite');
        const store = transaction.objectStore('activities');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const activity = getRequest.result;
                if (activity) {
                    Object.assign(activity, updates);
                    const updateRequest = store.put(activity);
                    updateRequest.onsuccess = () => resolve(activity);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Activity not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getFavoriteActivities() {
        const transaction = this.db.transaction(['activities'], 'readonly');
        const store = transaction.objectStore('activities');
        const index = store.index('isFavorite');

        return new Promise((resolve, reject) => {
            const request = index.getAll(true);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Activity history management
    async saveActivityHistory(historyEntry) {
        const transaction = this.db.transaction(['activityHistory'], 'readwrite');
        const store = transaction.objectStore('activityHistory');

        const historyData = {
            ...historyEntry,
            date: historyEntry.date || new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(historyData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getActivityHistory(limit = 100) {
        const transaction = this.db.transaction(['activityHistory'], 'readonly');
        const store = transaction.objectStore('activityHistory');
        const index = store.index('date');

        return new Promise((resolve, reject) => {
            const request = index.getAll();
            request.onsuccess = () => {
                const history = request.result
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, limit);
                resolve(history);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Photo management
    async savePhoto(photoBlob, historyId) {
        const transaction = this.db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');

        const photoData = {
            blob: photoBlob,
            historyId: historyId,
            dateAdded: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(photoData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPhoto(photoId) {
        const transaction = this.db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');

        return new Promise((resolve, reject) => {
            const request = store.get(photoId);
            request.onsuccess = () => {
                const photo = request.result;
                if (photo) {
                    // Convert blob to URL for display
                    const url = URL.createObjectURL(photo.blob);
                    resolve({ ...photo, url });
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPhotosForHistory(historyId) {
        const transaction = this.db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const index = store.index('historyId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(historyId);
            request.onsuccess = () => {
                const photos = request.result.map(photo => ({
                    ...photo,
                    url: URL.createObjectURL(photo.blob)
                }));
                resolve(photos);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Settings management
    async saveSetting(key, value) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');

        const settingData = { key, value };

        return new Promise((resolve, reject) => {
            const request = store.put(settingData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key, defaultValue = null) {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const setting = request.result;
                resolve(setting ? setting.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // User-added activities
    async saveUserActivity(activity) {
        const transaction = this.db.transaction(['userActivities'], 'readwrite');
        const store = transaction.objectStore('userActivities');

        const activityData = {
            ...activity,
            dateAdded: new Date().toISOString(),
            isUserAdded: true
        };

        return new Promise((resolve, reject) => {
            const request = store.add(activityData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserActivities() {
        const transaction = this.db.transaction(['userActivities'], 'readonly');
        const store = transaction.objectStore('userActivities');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility methods
    async clearAllData() {
        const storeNames = ['activities', 'activityHistory', 'photos', 'userActivities'];
        const transaction = this.db.transaction(storeNames, 'readwrite');

        const promises = storeNames.map(storeName => {
            return new Promise((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        return Promise.all(promises);
    }

    async exportData() {
        const activities = await this.getActivities();
        const history = await this.getActivityHistory();
        const userActivities = await this.getUserActivities();

        return {
            activities,
            history,
            userActivities,
            exportDate: new Date().toISOString()
        };
    }
}

// Global database instance
window.coupleCraftsDB = new CoupleCraftsDB();

