/**
 * Google Calendar Service
 * Handles all Google Calendar integration functionality
 */

// Safety check: Ensure googleConfig exists before proceeding
if (!window.googleConfig) {
    console.warn('[CalendarService] googleConfig not found, creating default configuration');
    window.googleConfig = {
        clientId: '130886081901-rl6m42a8t5b549jq797eh8b86q8ikncu.apps.googleusercontent.com',
        apiKey: 'AIzaSyBTCFOAU1zLTSkZtk_mWNhNKGJMSpkwLIU', // Replace with your actual API key
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        authorizedDomains: ['localhost', '127.0.0.1', 'quicknoteai-77.firebaseapp.com']
    };
}

// Ensure authorizedDomains is always an array
if (!window.googleConfig.authorizedDomains || !Array.isArray(window.googleConfig.authorizedDomains)) {
    window.googleConfig.authorizedDomains = ['localhost', '127.0.0.1', 'quicknoteai-77.firebaseapp.com'];
}

const calendarService = {
    initialized: false,
    tokenClient: null,
    autoSync: false,

    /**
     * Initialize Google Calendar API
     */
    async initialize() {
        try {
            if (this.initialized) {
                return this.tokenClient;
            }

            // Check if we're on an authorized domain with proper null checks
            const currentDomain = window.location.hostname;
            const authorizedDomains = window.googleConfig?.authorizedDomains || [];
            
            if (!Array.isArray(authorizedDomains) || authorizedDomains.length === 0) {
                console.warn('[Calendar] No authorized domains configured');
                return null;
            }
            
            if (!authorizedDomains.includes(currentDomain)) {
                console.warn(`[Calendar] Domain ${currentDomain} not authorized for Google Calendar API`);
                return null;
            }

            // Check if required Google APIs are loaded
            if (typeof google === 'undefined' || typeof gapi === 'undefined') {
                throw new Error('Google APIs not loaded');
            }

            // Initialize the Google API client
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: (error) => reject(new Error('Failed to load Google API client: ' + error?.message || 'Unknown error')),
                    timeout: 5000,
                    ontimeout: () => reject(new Error('Google API client load timeout'))
                });
            });

            // Initialize the client with API key and discovery docs
            await gapi.client.init({
                apiKey: window.googleConfig.apiKey,
                discoveryDocs: window.googleConfig.discoveryDocs
            });

            // Initialize token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: window.googleConfig.clientId,
                scope: window.googleConfig.scopes.join(' '),
                callback: '', // Will be set later in getAccessToken
                error_callback: (err) => {
                    console.error('[Calendar] Token client error:', err);
                    throw err;
                }
            });

            this.initialized = true;
            return this.tokenClient;
        } catch (error) {
            console.error('[Calendar] Initialization error:', error);
            throw error;
        }
    },

    /**
     * Get access token for Google Calendar API
     */
    async getAccessToken() {
        try {
            if (!this.tokenClient) {
                await this.initialize();
            }

            return await new Promise((resolve, reject) => {
                this.tokenClient.callback = (resp) => {
                    if (resp.error) {
                        reject(resp);
                    }
                    resolve(resp.access_token);
                };

                this.tokenClient.requestAccessToken({ prompt: '' });
            });
        } catch (error) {
            console.error('[Calendar] Access token error:', error);
            throw error;
        }
    },

    /**
     * Add task to Google Calendar
     */
    async addTaskToCalendar(task) {
        try {
            await this.getAccessToken();

            const event = {
                summary: task.title,
                description: task.description || '',
                start: {
                    dateTime: task.dueDate,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: new Date(new Date(task.dueDate).getTime() + 60*60*1000).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            return response.result;
        } catch (error) {
            console.error('[Calendar] Add event error:', error);
            throw error;
        }
    },

    /**
     * Check connection status
     */
    isConnected() {
        return this.initialized && this.tokenClient !== null;
    },

    /**
     * Disconnect from Google Calendar
     */
    disconnect() {
        this.initialized = false;
        this.tokenClient = null;
        google.accounts.oauth2.revoke(this.lastAccessToken, () => {
            console.log('[Calendar] Disconnected from Google Calendar');
        });
    },

    /**
     * Set auto-sync preference
     */
    setAutoSync(enabled) {
        this.autoSync = enabled;
        localStorage.setItem('calendarAutoSync', enabled);
    },

    /**
     * Get auto-sync preference
     */
    getAutoSync() {
        return localStorage.getItem('calendarAutoSync') === 'true';
    }
};

// Export for use in other files
window.calendarService = calendarService;
