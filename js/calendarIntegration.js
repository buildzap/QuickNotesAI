/**
 * Calendar Integration Module
 * Handles all Google Calendar integration functionality
 */
// Calendar Integration Module
(function() {
    // Private state
    let _token = null;
    let _connected = false;
    let initialized = false;
    let tokenClient = null;
    let autoSync = false;
    let isPremiumUser = false;

    // Get Google Calendar API configuration from global config
    const GOOGLE_CLIENT_ID = window.googleConfig?.clientId;
    const GOOGLE_API_SCOPE = window.googleConfig?.scopes[0];

    // Module interface
    window.calendarIntegration = {
        // State getters
        isConnected: () => _connected,
        isInitialized: () => initialized,
        getAutoSync: () => autoSync,

        // Initialize calendar integration
        initialize: async function() {
            console.log('[Calendar] Starting initialization...');
            try {
                // Always set up event listeners first
                this.setupEventListeners();

                // Wait for Firebase auth state
                await window.firebaseInitialized;
                const user = firebase.auth().currentUser;
                
                if (!user) {
                    console.error('[Calendar] No user logged in');
                    this.updateUI({ isPremium: false });
                    return;
                }

                console.log('[Calendar] User logged in:', user.email);

                // Check premium status using the global function
                const isPremium = await window.checkPremiumStatus();
                console.log('[Calendar] Premium status for', user.email, ':', isPremium);

                if (!isPremium) {
                    console.log('[Calendar] User is not premium, showing upgrade message');
                    this.updateUI({ isPremium: false });
                    return;
                }

                // User is premium, proceed with initialization
                console.log('[Calendar] User is premium, proceeding with initialization');
                
                // Initialize Google API if needed
                if (!gapi?.client) {
                    console.log('[Calendar] Initializing Google API client...');
                    await this.initGoogleApi();
                }

                // Update UI to show connection button
                this.updateUI({ isPremium: true });

                initialized = true;
                console.log('[Calendar] Initialization complete');

                return true;
            } catch (error) {
                console.error('[Calendar] Initialization error:', error);
                this.updateUI({ isPremium: false });
                throw error;
            }
        },

        // Initialize Google API Client
        initGoogleApi: async function() {
            return new Promise((resolve, reject) => {
                gapi.load('client:auth2', async () => {
                    try {
                        await gapi.client.init({
                            clientId: GOOGLE_CLIENT_ID,
                            scope: GOOGLE_API_SCOPE,
                            plugin_name: 'QuickNotes AI'
                        });

                        // Initialize token client
                        tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: GOOGLE_CLIENT_ID,
                            scope: GOOGLE_API_SCOPE,
                            callback: (response) => {
                                if (response.error) {
                                    reject(response);
                                    return;
                                }
                                _token = response.access_token;
                                _connected = true;
                                this.updateUI({ isConnected: true });
                                resolve();
                            }
                        });

                        resolve();
                    } catch (error) {
                        console.error('[Calendar] Google API init error:', error);
                        reject(error);
                    }
                });
            });
        },

        // Update UI based on state
        updateUI: function({ isPremium = null, isConnected = null } = {}) {
            const container = document.getElementById('calendarContainer');
            const premiumRequired = document.getElementById('calendarPremiumRequired');
            const notConnectedSection = document.getElementById('calendarNotConnected');
            const connectedSection = document.getElementById('calendarConnected');
            
            if (!container) {
                console.error('[Calendar] Container element not found');
                return;
            }

            console.log('[Calendar] Updating UI - Premium:', isPremium, 'Connected:', isConnected);

            // Make container visible
            container.classList.remove('d-none');

            // Handle premium status
            if (isPremium === false) {
                console.log('[Calendar] Showing premium required message');
                if (premiumRequired) {
                    premiumRequired.classList.remove('d-none');
                    notConnectedSection.classList.add('d-none');
                    connectedSection.classList.add('d-none');
                }
                return;
            }

            // User is premium, hide upgrade message
            if (premiumRequired) {
                console.log('[Calendar] Hiding premium required message');
                premiumRequired.classList.add('d-none');
            }

            // Handle connection state for premium users
            if (notConnectedSection && connectedSection) {
                const connectionState = isConnected ?? _connected;
                console.log('[Calendar] Setting connection state:', connectionState);
                
                notConnectedSection.classList.toggle('d-none', connectionState);
                connectedSection.classList.toggle('d-none', !connectionState);
                
                // Update button states
                const connectBtn = document.getElementById('connectCalendarBtn');
                const syncBtn = document.getElementById('syncSelectedTasksBtn');
                const autoSyncToggle = document.getElementById('autoSyncToggle');

                if (connectBtn) connectBtn.disabled = connectionState;
                if (syncBtn) syncBtn.disabled = !connectionState;
                if (autoSyncToggle) {
                    autoSyncToggle.checked = autoSync;
                    autoSyncToggle.disabled = !connectionState;
                }
            }

            // Update button states
            const connectBtn = document.getElementById('connectCalendarBtn');
            const syncBtn = document.getElementById('syncSelectedTasksBtn');
            const autoSyncToggle = document.getElementById('autoSyncToggle');

            if (connectBtn) connectBtn.disabled = _connected;
            if (syncBtn) syncBtn.disabled = !_connected;
            if (autoSyncToggle) {
                autoSyncToggle.checked = autoSync;
                autoSyncToggle.disabled = !_connected;
            }
        },

        // Set up event listeners
        setupEventListeners: function() {
            const connectBtn = document.getElementById('connectCalendarBtn');
            const disconnectBtn = document.getElementById('disconnectCalendarBtn');
            const autoSyncToggle = document.getElementById('autoSyncToggle');
            const syncBtn = document.getElementById('syncSelectedTasksBtn');

            if (connectBtn) {
                connectBtn.addEventListener('click', async () => {
                    try {
                        await this.connect();
                    } catch (error) {
                        console.error('[Calendar] Connect error:', error);
                        window.showToast?.('Failed to connect to Google Calendar', 'error');
                    }
                });
            }

            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', async () => {
                    try {
                        await this.disconnect();
                    } catch (error) {
                        console.error('[Calendar] Disconnect error:', error);
                        window.showToast?.('Failed to disconnect from Google Calendar', 'error');
                    }
                });
            }

            if (autoSyncToggle) {
                autoSyncToggle.addEventListener('change', (e) => {
                    autoSync = e.target.checked;
                    localStorage.setItem('calendarAutoSync', autoSync);
                    window.showToast?.(`Auto-sync ${autoSync ? 'enabled' : 'disabled'}`, 'info');
                });
            }

            if (syncBtn) {
                syncBtn.addEventListener('click', async () => {
                    if (!_connected) {
                        window.showToast?.('Please connect to Google Calendar first', 'warning');
                        return;
                    }
                    try {
                        await this.syncSelectedTasks();
                    } catch (error) {
                        console.error('[Calendar] Sync error:', error);
                        window.showToast?.('Failed to sync tasks with calendar', 'error');
                    }
                });
            }
        },

        // Connect to Google Calendar
        connect: async function() {
            try {
                if (!tokenClient) {
                    throw new Error('Google API not initialized');
                }
                
                // Request user consent
                tokenClient.requestAccessToken();
                
            } catch (error) {
                console.error('[Calendar] Connect error:', error);
                window.showToast?.('Failed to connect to Google Calendar', 'error');
                throw error;
            }
        },

        // Disconnect from Google Calendar
        disconnect: async function() {
            try {
                if (gapi.client.getToken()) {
                    google.accounts.oauth2.revoke(_token);
                    gapi.client.setToken('');
                }
                _connected = false;
                _token = null;
                this.updateUI({ isConnected: false });
                window.showToast?.('Disconnected from Google Calendar', 'success');
            } catch (error) {
                console.error('[Calendar] Disconnect error:', error);
                window.showToast?.('Failed to disconnect from Google Calendar', 'error');
                throw error;
            }
        },

        // Sync selected tasks with calendar
        syncSelectedTasks: async function() {
            if (!_connected) {
                throw new Error('Not connected to Google Calendar');
            }

            try {
                const selectedTasks = window.taskModule?.getSelectedTasks() || [];
                if (selectedTasks.length === 0) {
                    window.showToast?.('Please select tasks to sync', 'warning');
                    return;
                }

                // Calendar sync logic
                for (const task of selectedTasks) {
                    const event = {
                        summary: task.title,
                        description: task.description,
                        start: {
                            dateTime: task.dueDate,
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        },
                        end: {
                            dateTime: new Date(new Date(task.dueDate).getTime() + 60*60*1000).toISOString(),
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
                    };

                    await gapi.client.calendar.events.insert({
                        calendarId: 'primary',
                        resource: event
                    });
                }

                window.showToast?.('Tasks synced with Google Calendar', 'success');
                const lastSyncTime = document.getElementById('lastSyncTime');
                if (lastSyncTime) {
                    lastSyncTime.textContent = new Date().toLocaleString();
                }
            } catch (error) {
                console.error('[Calendar] Sync error:', error);
                window.showToast?.('Failed to sync tasks with calendar', 'error');
                throw error;
            }
        }
    };
})();
