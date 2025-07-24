// gcal.js
// Google Calendar integration for premium users
window.gcal = window.gcal || {};

// Safety check: Ensure googleConfig exists before proceeding
if (!window.googleConfig) {
    console.warn('[gcal] googleConfig not found, creating default configuration');
    window.googleConfig = {
        clientId: '130886081901-rl6m42a8t5b549jq797eh8b86q8ikncu.apps.googleusercontent.com',
        apiKey: 'AIzaSyBTCFOAU1zLTSkZtk_mWNhNKGJMSpkwLIU', // Replace with your actual API key
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        authorizedDomains: ['localhost', '127.0.0.1', 'quicknoteai-77.firebaseapp.com']
    };
}

// Configuration - these should be set in your environment
window.gcal.CLIENT_ID = window.googleConfig?.clientId || '130886081901-rl6m42a8t5b549jq797eh8b86q8ikncu.apps.googleusercontent.com';
window.gcal.API_KEY = window.googleConfig?.apiKey || 'AIzaSyBTCFOAU1zLTSkZtk_mWNhNKGJMSpkwLIU'; // Replace with your actual API key
window.gcal.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Ensure authorizedDomains is always an array
if (!window.googleConfig.authorizedDomains || !Array.isArray(window.googleConfig.authorizedDomains)) {
    window.googleConfig.authorizedDomains = ['localhost', '127.0.0.1', 'quicknoteai-77.firebaseapp.com'];
}

// Use the validation function from google-config.js
function validateGcalConfiguration() {
    if (window.validateGoogleConfiguration) {
        return window.validateGoogleConfiguration();
    }
    
    // Fallback validation if google-config.js is not loaded
    const issues = [];
    
    if (!window.gcal.CLIENT_ID || window.gcal.CLIENT_ID === 'YOUR_CLIENT_ID') {
        issues.push('Client ID not configured');
    }
    
    if (!window.gcal.API_KEY || window.gcal.API_KEY === 'YOUR_API_KEY') {
        issues.push('API Key not configured');
    }
    
    // Check if we're on an authorized domain with proper null checks
    const currentDomain = window.location.hostname;
    const authorizedDomains = window.googleConfig?.authorizedDomains || [];
    
    if (!Array.isArray(authorizedDomains) || authorizedDomains.length === 0) {
        issues.push('No authorized domains configured');
    } else if (!authorizedDomains.includes(currentDomain)) {
        issues.push(`Domain ${currentDomain} not authorized`);
    }
    
    return {
        isValid: issues.length === 0,
        issues: issues
    };
}

// Use the error display function from google-config.js
function showGcalConfigError(issues) {
    if (window.showGoogleConfigurationError) {
        window.showGoogleConfigurationError(issues);
    } else {
        // Fallback error display
        const statusDiv = document.getElementById('gcal-status');
        if (statusDiv) {
            const errorMessage = issues.length > 0 ? 
                `Google Calendar not configured: ${issues.join(', ')}` :
                'Google Calendar configuration error';
            
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${errorMessage}
                    <br><small class="text-muted">
                        Please contact support to configure Google Calendar integration.
                    </small>
                </div>
            `;
            statusDiv.classList.remove('d-none');
        }
        
        console.error('[gcal] Configuration validation failed:', issues);
    }
}

// Add a configuration check function
window.gcal.checkConfiguration = function() {
    return validateGcalConfiguration();
};

// Set scopes specifically for task syncing (create events)
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Add global functions to window.gcal (these will be overwritten by the main object)
window.gcal.signIn = gcalSignIn;
window.gcal.signOut = gcalSignOut;
window.gcal.isSignedIn = isGcalSignedIn;
window.gcal.createEvent = addTaskToGcal;

let gapiInited = false;
let gisInited = false;

// Show error in UI
function showError(message) {
    const statusDiv = document.getElementById('gcal-status');
    if (statusDiv) {
        statusDiv.textContent = `Error: ${message}`;
        statusDiv.classList.remove('d-none', 'text-success');
        statusDiv.classList.add('text-danger');
        setTimeout(() => {
            statusDiv.classList.add('d-none');
        }, 5000);
    }
    console.error(message);
}

let tokenClient;
let accessToken = null;

// Load the Google API client library with retries
function loadGapiClient(retryCount = 0, maxRetries = 3) {
    return new Promise(async (resolve, reject) => {
        try {
            // If already initialized, resolve immediately
            if (gapiInited) return resolve();

            console.log('[gcal] Initializing Google API client...');

            // Make sure gapi is available
            if (!window.gapi) {
                throw new Error('Google API client library not loaded. Please check if the Google API script is included.');
            }

            console.log('[gcal] Loading client library...');
            
            // Load the client library
            await new Promise((loadResolve, loadReject) => {
                gapi.load('client', { 
                    callback: () => {
                        console.log('[gcal] Client library loaded successfully');
                        loadResolve();
                    },
                    onerror: (error) => {
                        console.error('[gcal] Failed to load client library:', error);
                        loadReject(error);
                    },
                    timeout: 10000, // 10 seconds timeout
                    ontimeout: () => {
                        console.error('[gcal] Timeout loading client library');
                        loadReject(new Error('Timeout loading Google API client'));
                    }
                });
            });

            // Double-check gapi client is loaded
            if (!gapi.client) {
                throw new Error('Google API client failed to load properly');
            }

            console.log('[gcal] Initializing client with API key:', 
                window.gcal.API_KEY.substring(0, 8) + '...');
                
            // Initialize the client
            await gapi.client.init({
                apiKey: window.gcal.API_KEY,
                discoveryDocs: [window.gcal.DISCOVERY_DOC],
            });

            console.log('[gcal] Client initialized, checking calendar API...');

            // Verify the initialization
            if (!gapi.client?.calendar) {
                throw new Error('Calendar API not initialized properly. Please check your API key permissions.');
            }

            console.log('[gcal] Google Calendar API initialized successfully');
            gapiInited = true;
            resolve();
        } catch (err) {
            console.error(`[gcal] Error initializing GAPI client (attempt ${retryCount + 1}):`, err);
            
            // Detailed error logging for different error types
            if (err.status === 403) {
                console.error('[gcal] 403 Forbidden error: Your API key may not have Calendar API access enabled');
                console.error('[gcal] Please check:');
                console.error('[gcal] 1. Google Calendar API is enabled in Google Cloud Console');
                console.error('[gcal] 2. API key has Calendar API access');
                console.error('[gcal] 3. API key restrictions are properly configured');
                console.error('[gcal] 4. Domain is authorized in API key settings');
                console.error('[gcal] 5. Current domain:', window.location.hostname);
                console.error('[gcal] 6. API key being used:', window.googleConfig?.apiKey?.substring(0, 10) + '...');
                
                // Show specific 403 error message
                const errorMsg = 'Google Calendar API access denied (403). Please enable Google Calendar API in Google Cloud Console and check API key permissions.';
                if (window.showGoogleConfigurationError) {
                    window.showGoogleConfigurationError(['403 Forbidden - API access denied']);
                }
                showError(errorMsg);
            } else if (err.status === 400) {
                console.error('[gcal] 400 Bad Request: API key format may be invalid');
                showError('Google Calendar API key is invalid (400). Please check your API key configuration.');
            } else if (err.status === 401) {
                console.error('[gcal] 401 Unauthorized: API key may be invalid or expired');
                showError('Google Calendar authentication failed (401). Please check your API key.');
            }
            
            // Retry logic for specific errors
            if (retryCount < maxRetries && (
                err.message?.includes('403') || 
                err.message?.includes('loading') ||
                err.status === 403
            )) {
                const delay = (retryCount + 1) * 1500; // Increasing delay for each retry
                console.log(`[gcal] Retrying GAPI initialization in ${delay}ms...`);
                setTimeout(() => {
                    loadGapiClient(retryCount + 1, maxRetries)
                        .then(resolve)
                        .catch(reject);
                }, delay);
                return;
            }

            reject(err);
        }
    });
}

// Initialize Google Identity Services for OAuth2 with enhanced security
function initTokenClient() {
    if (tokenClient) return;
    if (!window.gcal.CLIENT_ID) {
        throw new Error('Google Calendar Client ID not configured');
    }

    // Validate origin to prevent OAuth phishing
    const isSecureOrigin = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
    
    if (!isSecureOrigin) {
        throw new Error('Google Calendar integration requires a secure origin (HTTPS or localhost)');
    }

    // Check if Google Identity Services is available
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        throw new Error('Google Identity Services not loaded. Please check if the Google Identity Services script is included.');
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.gcal.CLIENT_ID,
        scope: SCOPES,
        prompt: 'consent',
        access_type: 'offline',
        include_granted_scopes: true,
        state: window.btoa(window.location.origin),
        ux_mode: 'popup',
        error_callback: (err) => {
            console.error('OAuth error:', err);
            showError('Failed to connect to Google Calendar. Please try again.');
        },
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                // Validate token before storing
                try {
                    const payload = JSON.parse(atob(tokenResponse.access_token.split('.')[1]));
                    if (payload.aud !== window.gcal.CLIENT_ID) {
                        console.error('Invalid token audience');
                        return;
                    }
                } catch (e) {
                    console.warn('Could not validate token payload:', e);
                }
                accessToken = tokenResponse.access_token;
                localStorage.setItem('gcal_access_token', accessToken);
                // Store token expiry
                const expiryDate = new Date();
                expiryDate.setSeconds(expiryDate.getSeconds() + tokenResponse.expires_in);
                localStorage.setItem('gcal_token_expiry', expiryDate.toISOString());
            }
        },
    });
}

// Helper to store token and expiry
function handleTokenResponse(response) {
    if (response && response.access_token) {
        localStorage.setItem('gcal_access_token', response.access_token);
        localStorage.setItem('gcal_token_expiry', new Date(Date.now() + (response.expires_in || 3600) * 1000).toISOString());
        accessToken = response.access_token;
        if (window.updateSyncButton) window.updateSyncButton();
    }
}

// Patch gcalSignIn to use handleTokenResponse
async function gcalSignIn() {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            try { initTokenClient(); } catch (e) { return reject(e); }
        }
        tokenClient.callback = (resp) => {
            if (resp && resp.access_token) {
                handleTokenResponse(resp);
                resolve(resp);
            } else {
                reject(resp);
            }
        };
        try {
            tokenClient.requestAccessToken();
        } catch (e) {
            reject(e);
        }
    });
}

// Sign out (revoke token)
async function gcalSignOut() {
    try {
        // Revoke the token if we have one
        const accessToken = localStorage.getItem('gcal_access_token');
        if (accessToken) {
            try {
                // Revoke the token via Google's revoke endpoint
                await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                console.log('[gcal] Token revoked successfully');
            } catch (error) {
                console.warn('[gcal] Failed to revoke token:', error);
                // Continue with sign out even if token revocation fails
            }
        }
        
        // Clear local storage
        localStorage.removeItem('gcal_access_token');
        localStorage.removeItem('gcal_token_expiry');
        
        // Clear any global variables
        if (typeof accessToken !== 'undefined') {
            accessToken = null;
        }
        
        // Clear gapi token if available
        if (window.gapi && window.gapi.client) {
            try {
                window.gapi.client.setToken(null);
            } catch (e) {
                console.log('[gcal] gapi token cleared');
            }
        }
        
        console.log('[gcal] Sign out completed successfully');
    } catch (error) {
        console.error('[gcal] Error during sign out:', error);
        // Still clear local storage even if there's an error
        localStorage.removeItem('gcal_access_token');
        localStorage.removeItem('gcal_token_expiry');
    }
}

// Check if user is signed in
function isGcalSignedIn() {
    return !!localStorage.getItem('gcal_access_token');
}

// Fetch upcoming events from user's Google Calendar
async function fetchGcalEvents(maxResults = 10) {
    await loadGapiClient();
    const token = localStorage.getItem('gcal_access_token');
    if (!token) throw new Error('Not signed in to Google Calendar');
    gapi.client.setToken({ access_token: token });
    const now = new Date().toISOString();
    const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: now,
        showDeleted: false,
        singleEvents: true,
        maxResults,
        orderBy: 'startTime',
    });
    return response.result.items;
}

// Helper function to validate and format dates
function validateAndFormatDate(date, fieldName) {
    if (!date) {
        throw new Error(`${fieldName} is required`);
    }

    let dateObj;
    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        throw new Error(`Invalid ${fieldName.toLowerCase()} type`);
    }

    if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid ${fieldName.toLowerCase()} format`);
    }

    return {
        dateTime: dateObj.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

// Add task to Google Calendar with meeting support
async function addTaskToGcal(task) {
    if (!isGcalSignedIn()) {
        throw new Error('Not signed in to Google Calendar');
    }

    if (!task?.id) {
        throw new Error('Task ID is required');
    }

    if (!task?.title) {
        throw new Error('Task title is required');
    }

    try {
        // First check if an event already exists for this task
        const existingEvents = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            q: `Task ID: ${task.id}`,
            timeMin: new Date().toISOString()
        });

        if (existingEvents.result.items?.length > 0) {
            // Update existing event instead of creating a new one
            const existingEvent = existingEvents.result.items[0];
            return await updateTaskInGcal({ ...task, eventId: existingEvent.id });
        }

        // Validate and format dates
        const start = validateAndFormatDate(task.startDate, 'Start date');
        const end = validateAndFormatDate(task.endDate, 'End date');

        // Create event data
        const eventData = {
            summary: task.title,
            description: `${task.description || ''}\n\nPriority: ${task.priority}\nTask ID: ${task.id}`,
            start,
            end,
            reminders: {
                useDefault: !task.isScheduledMeeting,
                overrides: task.isScheduledMeeting ? [
                    { method: 'popup', minutes: 30 },
                    { method: 'popup', minutes: 5 }
                ] : undefined
            }
        };

        // Create the event
        const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: eventData
        });

        if (!response?.result) {
            throw new Error('Failed to create calendar event');
        }

        return response.result;
    } catch (error) {
        console.error('Error adding event to Google Calendar:', error);
        if (error.result?.error?.message) {
            throw new Error(error.result.error.message);
        } else {
            throw new Error(error.message || 'Failed to add event to Google Calendar');
        }
    }
}
window.gcal.addTaskToGcal = addTaskToGcal;

// Add recurring task to Google Calendar with recurring pattern
async function addRecurringTaskToGcal(task, syncDuration = '1month') {
    console.log('[gcal] addRecurringTaskToGcal called with:', { taskId: task?.id, taskTitle: task?.title, syncDuration });
    
    if (!isGcalSignedIn()) {
        console.log('[gcal] Not signed in to Google Calendar');
        throw new Error('Not signed in to Google Calendar');
    }

    if (!task?.id) {
        console.log('[gcal] Task ID is missing');
        throw new Error('Task ID is required');
    }

    if (!task?.title) {
        console.log('[gcal] Task title is missing');
        throw new Error('Task title is required');
    }

    if (!task?.recurring || !task?.recurrence) {
        console.log('[gcal] Task is not recurring:', { recurring: task?.recurring, recurrence: task?.recurrence });
        throw new Error('Task is not a recurring task');
    }

    try {
        console.log('[gcal] Creating recurring event for task:', task.title, 'with duration:', syncDuration);

        // First check if an event already exists for this task
        const existingEvents = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            q: `Task ID: ${task.id}`,
            timeMin: new Date().toISOString()
        });

        if (existingEvents.result.items?.length > 0) {
            console.log('[gcal] Recurring event already exists, updating...');
            const existingEvent = existingEvents.result.items[0];
            return await updateRecurringTaskInGcal({ ...task, eventId: existingEvent.id });
        }

        // Calculate start and end times based on recurrence time (NOT due date)
        const [hours, minutes] = (task.recurrence.time || '09:00').split(':').map(Number);
        console.log('[gcal] Recurrence time parsed:', { hours, minutes });
        
        // Use today's date as the start date, but set the time to the recurring time
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        // If the time has already passed today, start from tomorrow
        if (startDate < new Date()) {
            startDate.setDate(startDate.getDate() + 1);
            console.log('[gcal] Time already passed today, starting from tomorrow');
        }
        
        const endDate = new Date(startDate);
        endDate.setHours(hours + 1, minutes, 0, 0); // 1 hour duration

        console.log('[gcal] Calculated event times:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            recurrenceTime: task.recurrence.time
        });

        // Create RRULE (recurrence rule) based on task recurrence type and sync duration
        const rrule = createRRule(task.recurrence, startDate, syncDuration);
        console.log('[gcal] Created RRULE:', rrule);

        // Create event data with recurrence
        const eventData = {
            summary: `${task.title} 🔄`,
            description: `${task.description || ''}\n\nPriority: ${task.priority}\nTask ID: ${task.id}\nRecurring: ${formatRecurrenceInfo(task.recurrence)}\nSync Duration: ${syncDuration === '1week' ? '1 Week' : '1 Month'}`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            recurrence: [rrule],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 60 }
                ]
            },
            extendedProperties: {
                private: {
                    taskId: task.id,
                    isRecurring: 'true',
                    recurrenceType: task.recurrence.type,
                    syncDuration: syncDuration
                }
            }
        };

        console.log('[gcal] Creating recurring event with data:', eventData);

        // Create the recurring event
        const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: eventData
        });

        if (!response?.result) {
            console.log('[gcal] No response result from calendar API');
            throw new Error('Failed to create recurring calendar event');
        }

        console.log('[gcal] Recurring event created successfully:', response.result.id);
        return response.result;
    } catch (error) {
        console.error('[gcal] Error adding recurring event to Google Calendar:', error);
        if (error.result?.error?.message) {
            throw new Error(error.result.error.message);
        } else {
            throw new Error(error.message || 'Failed to add recurring event to Google Calendar');
        }
    }
}
window.gcal.addRecurringTaskToGcal = addRecurringTaskToGcal;

// Helper function to create RRULE for Google Calendar
function createRRule(recurrence, startDate, syncDuration = '1month') {
    console.log('[gcal] createRRule called with:', { recurrence, startDate, syncDuration });
    
    const endDate = new Date(startDate);
    
    // Set end date based on sync duration
    if (syncDuration === '1week') {
        endDate.setDate(endDate.getDate() + 7); // End after one week
        console.log('[gcal] Setting end date to 1 week from start');
    } else {
        endDate.setMonth(endDate.getMonth() + 1); // End after one month (default)
        console.log('[gcal] Setting end date to 1 month from start');
    }

    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    console.log('[gcal] End date string for RRULE:', endDateStr);

    let rrule;
    switch (recurrence.type) {
        case 'daily':
            rrule = `RRULE:FREQ=DAILY;UNTIL=${endDateStr}`;
            break;
        case 'weekly':
            rrule = `RRULE:FREQ=WEEKLY;UNTIL=${endDateStr}`;
            break;
        case 'monthly':
            rrule = `RRULE:FREQ=MONTHLY;UNTIL=${endDateStr}`;
            break;
        case 'custom':
            const interval = recurrence.interval || 7;
            rrule = `RRULE:FREQ=DAILY;INTERVAL=${interval};UNTIL=${endDateStr}`;
            break;
        default:
            rrule = `RRULE:FREQ=DAILY;UNTIL=${endDateStr}`;
    }
    
    console.log('[gcal] Created RRULE:', rrule);
    return rrule;
}

// Helper function to format recurrence info for display
function formatRecurrenceInfo(recurrence) {
    if (!recurrence) return '';
    
    const type = recurrence.type || '';
    const time = recurrence.time || '';
    const interval = recurrence.interval;
    
    let info = '';
    switch (type) {
        case 'daily':
            info = 'Daily';
            break;
        case 'weekly':
            info = 'Weekly';
            break;
        case 'monthly':
            info = 'Monthly';
            break;
        case 'custom':
            info = `Every ${interval || 7} days`;
            break;
        default:
            info = type;
    }
    
    if (time) {
        info += ` at ${time}`;
    }
    
    return info;
}

// Update existing recurring task in Google Calendar
async function updateRecurringTaskInGcal(task) {
    if (!task || !task.title) {
        throw new Error('Invalid task data');
    }

    await loadGapiClient();
    const token = localStorage.getItem('gcal_access_token');
    if (!token) {
        throw new Error('Not signed in to Google Calendar');
    }

    try {
        gapi.client.setToken({ access_token: token });

        // If we have a specific event ID, use it
        let eventId = task.eventId;

        // If not, search for existing event by task ID
        if (!eventId) {
            const existingEvents = await gapi.client.calendar.events.list({
                calendarId: 'primary',
                q: task.id,
                singleEvents: true
            });

            if (existingEvents.result.items?.length > 0) {
                eventId = existingEvents.result.items[0].id;
            } else {
                // If no existing event found, create a new one instead
                return await addRecurringTaskToGcal(task);
            }
        }

        // Calculate start and end times based on recurrence time
        const [hours, minutes] = (task.recurrence.time || '09:00').split(':').map(Number);
        
        // Use today's date as the start date, but set the time to the recurring time
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        // If the time has already passed today, start from tomorrow
        if (startDate < new Date()) {
            startDate.setDate(startDate.getDate() + 1);
        }
        
        const endDate = new Date(startDate);
        endDate.setHours(hours + 1, minutes, 0, 0); // 1 hour duration

        // Add startDate and endDate to task for compatibility with existing functions
        task.startDate = startDate;
        task.endDate = endDate;

        // Create RRULE (recurrence rule) based on task recurrence type
        const rrule = createRRule(task.recurrence, startDate);

        // Create event data with recurrence
        const eventData = {
            summary: `${task.title} 🔄`,
            description: `${task.description || ''}\n\nPriority: ${task.priority}\nTask ID: ${task.id}\nRecurring: ${formatRecurrenceInfo(task.recurrence)}`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            recurrence: [rrule],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 60 }
                ]
            },
            extendedProperties: {
                private: {
                    taskId: task.id,
                    isRecurring: 'true',
                    recurrenceType: task.recurrence.type
                }
            }
        };

        // Update the recurring event
        const response = await gapi.client.calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: eventData
        });

        return response.result;
    } catch (error) {
        console.error('[gcal] Error updating recurring event in Google Calendar:', error);
        throw error;
    }
}

// Update existing task in Google Calendar
async function updateTaskInGcal(task) {
    if (!task || !task.title) {
        throw new Error('Invalid task data');
    }

    await loadGapiClient();
    const token = localStorage.getItem('gcal_access_token');
    if (!token) {
        throw new Error('Not signed in to Google Calendar');
    }

    try {
        gapi.client.setToken({ access_token: token });

        // If we have a specific event ID, use it
        let eventId = task.eventId;

        // If not, search for existing event by task ID
        if (!eventId) {
            const existingEvents = await gapi.client.calendar.events.list({
                calendarId: 'primary',
                q: task.id,
                singleEvents: true
            });

            if (existingEvents.result.items?.length > 0) {
                eventId = existingEvents.result.items[0].id;
            } else {
                // If no existing event found, create a new one instead
                return await addTaskToGcal(task);
            }
        }

        // Ensure we have valid dates
        const startDate = task.startDate instanceof Date ? task.startDate : new Date(task.startDate);
        const endDate = task.endDate instanceof Date ? task.endDate : new Date(task.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date format');
        }

        // Create event data
        const eventData = {
            summary: task.title,
            description: `${task.description || ''}\n\nPriority: ${task.priority}\nTask ID: ${task.id}`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 }
                ]
            }
        };

        // Add Google Meet link and additional settings for scheduled meetings
        if (task.isScheduledMeeting) {
            // Only add conference data if it doesn't already exist
            eventData.conferenceData = {
                createRequest: {
                    requestId: task.id,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            };
            // Add more specific reminders for meetings
            eventData.reminders.overrides = [
                { method: 'popup', minutes: 30 },
                { method: 'email', minutes: 60 }
            ];
        }

        // Update the event
        const response = await gapi.client.calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: eventData,
            conferenceDataVersion: task.isScheduledMeeting ? 1 : 0
        });

        return response.result;
    } catch (error) {
        console.error('Error updating event in Google Calendar:', error);
        throw error;
    }
}

// Find event by task ID
async function findEventByTaskId(taskId) {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: threeMonthsAgo.toISOString(),
        timeMax: new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // One year ahead
        singleEvents: true,
        orderBy: 'startTime',
        privateExtendedProperty: `taskId=${taskId}`
    });

    const events = response.result.items;
    return events && events.length > 0 ? events[0] : null;
}

// Check if an event already exists
async function checkEventExists(task) {
    try {
        const events = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(task.startDate).toISOString(),
            timeMax: new Date(task.endDate).toISOString(),
            q: task.title,
            privateExtendedProperty: `taskId=${task.id}`
        });

        return events.result.items && events.result.items.length > 0;
    } catch (err) {
        console.error('[gcal] Error checking existing event:', err);
        return false;
    }
}

// Backend: Store Google OAuth2 token in Firestore via Cloud Function
// Call this after successful sign-in if you want to store tokens securely
async function sendTokenToBackend(token) {
    try {
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const response = await fetch('https://us-central1-quicknoteai-77.cloudfunctions.net/storeGoogleToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({ access_token: token })
        });
        if (!response.ok) throw new Error('Failed to store token in backend');
        return await response.json();
    } catch (err) {
        console.error('[gcal] sendTokenToBackend error:', err);
        throw err;
    }
}

// --- Google OAuth2 Flow (Alternative: gapi.auth2) ---
function initGoogleOAuth() {
    if (!window.gapi) {
        alert('Google API script not loaded!');
        return;
    }
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            clientId: CLIENT_ID,
            discoveryDocs: [window.gcal.DISCOVERY_DOC],
            scope: SCOPES
        });
        const authInstance = gapi.auth2.getAuthInstance();
        authInstance.signIn().then(googleUser => {
            const accessToken = googleUser.getAuthResponse().access_token;
            localStorage.setItem('gcal_token', accessToken);
            alert('Google Calendar connected!');
        });
    });
}

// Refresh token if needed
async function refreshTokenIfNeeded() {
    try {
        // Check if access token exists
        const accessToken = getGcalAccessToken();
        if (!accessToken) {
            console.log('No access token found, skipping refresh');
            return false;
        }

        // Try to validate the current token
        try {
            const response = await gapi.client.oauth2.tokeninfo({
                access_token: accessToken
            });
            
            if (response.status === 200) {
                // Token is still valid
                return true;
            }
        } catch (err) {
            console.log('Token validation failed, refreshing...');
        }

        // Token is invalid or expired, get a new one
        return new Promise((resolve) => {
            tokenClient.requestAccessToken({
                prompt: '',
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        localStorage.setItem('gcal_access_token', tokenResponse.access_token);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// Utility: Get Google Calendar access token (from either flow)
function getGcalAccessToken() {
    // Prefer GIS token, fallback to gapi.auth2 token
    return localStorage.getItem('gcal_access_token') || localStorage.getItem('gcal_token') || null;
}

// Load Google Identity Services client
function loadGisClient() {
    return new Promise((resolve, reject) => {
        try {
            // Check if Google Identity Services is already loaded
            if (typeof google !== 'undefined' && google.accounts) {
                console.log('[gcal] Google Identity Services already loaded');
                resolve();
                return;
            }
            
            // If not loaded, we'll wait for it to load
            console.log('[gcal] Waiting for Google Identity Services to load...');
            
            // Check if the script is still loading
            const checkGisLoaded = () => {
                if (typeof google !== 'undefined' && google.accounts) {
                    console.log('[gcal] Google Identity Services loaded successfully');
                    resolve();
                } else {
                    // Try again in 100ms
                    setTimeout(checkGisLoaded, 100);
                }
            };
            
            checkGisLoaded();
            
            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error('Timeout waiting for Google Identity Services to load'));
            }, 10000);
            
        } catch (error) {
            console.error('[gcal] Error loading Google Identity Services:', error);
            reject(error);
        }
    });
}



// Main gcal object with all the necessary methods
window.gcal = {
    CLIENT_ID: window.gcal.CLIENT_ID,
    API_KEY: window.gcal.API_KEY,
    DISCOVERY_DOC: window.gcal.DISCOVERY_DOC,
    initGoogleCalendarApi: async function() {
        try {
            console.log('[gcal] Initializing Google Calendar API...');
            
            // First validate configuration
            const configValidation = validateGcalConfiguration();
            if (!configValidation.isValid) {
                console.error('[gcal] Configuration validation failed:', configValidation.issues);
                showGcalConfigError(configValidation.issues);
                throw new Error('Google Calendar configuration invalid: ' + configValidation.issues.join(', '));
            }
            
            // Use our improved loadGapiClient function
            await loadGapiClient();
            gapiInited = true;
            
            // Load Google Identity Services
            await loadGisClient();
            gisInited = true;
            
            // Check if we need to initialize the token client
            if (!tokenClient) {
                try {
                    initTokenClient();
                    console.log('[gcal] Token client initialized');
                } catch (tokenError) {
                    console.error('[gcal] Failed to initialize token client:', tokenError);
                    // Continue anyway, as we might only need the API but not auth
                }
            }
            
            // Check if the user is already signed in
            const isSignedIn = window.gcal.isSignedIn();
            console.log('[gcal] Google Calendar API initialized, signed in:', isSignedIn);
            
            return isSignedIn;
        } catch (error) {
            console.error('[gcal] Error initializing Google Calendar API:', error);
            
            // Show user-friendly error message
            if (error.message && error.message.includes('configuration invalid')) {
                showGcalConfigError([error.message]);
            } else if (error.status === 400) {
                showError('Google Calendar API key is invalid. Please contact support.');
            } else if (error.status === 403) {
                showError('Google Calendar API access denied. Please check your API key permissions.');
            } else {
                showError('Failed to connect to Google Calendar. Please try again later.');
            }
            
            return false;
        }
    },
    signIn: async function() {
        try {
            console.log('[gcal] Starting sign-in process...');
            
            // First validate configuration
            const configValidation = validateGcalConfiguration();
            if (!configValidation.isValid) {
                console.error('[gcal] Configuration validation failed:', configValidation.issues);
                showGcalConfigError(configValidation.issues);
                throw new Error('Google Calendar configuration invalid: ' + configValidation.issues.join(', '));
            }
            
            // Ensure the Google API client is initialized
            if (!window.gapi) {
                console.error('[gcal] Google API client not loaded');
                throw new Error('Google API client not loaded');
            }
            
            // Attempt to initialize APIs if not already initialized
            await loadGapiClient();
            
            // Initialize the token client if not already initialized
            if (!tokenClient) {
                console.log('[gcal] Initializing token client...');
                try {
                    initTokenClient();
                } catch (tokenError) {
                    console.error('[gcal] Failed to initialize token client:', tokenError);
                    throw new Error('Failed to initialize authentication: ' + tokenError.message);
                }
            }
            
            console.log('[gcal] Requesting access token...');
            
            // Use the improved gcalSignIn function
            const result = await gcalSignIn();
            console.log('[gcal] Sign-in successful');
            return result;
        } catch (error) {
            console.error('[gcal] Sign in error:', error);
            
            // Show user-friendly error message with more specific details
            if (error.message && error.message.includes('configuration invalid')) {
                showGcalConfigError([error.message]);
            } else if (error.status === 400) {
                showError('Google Calendar API key is invalid. Please check your API key configuration.');
            } else if (error.status === 403) {
                const errorMsg = 'Google Calendar API access denied (403). Please enable Google Calendar API in Google Cloud Console and check API key permissions.';
                showError(errorMsg);
                // Show detailed 403 troubleshooting
                if (window.showGoogleConfigurationError) {
                    window.showGoogleConfigurationError(['403 Forbidden - API access denied']);
                }
            } else if (error.status === 401) {
                showError('Google Calendar authentication failed. Please check your Client ID configuration.');
            } else {
                showError('Failed to connect to Google Calendar. Please try again later.');
            }
            
            throw error;
        }
    },
    signOut: async function() {
        try {
            // Clear local storage
            localStorage.removeItem('gcal_access_token');
            localStorage.removeItem('gcal_token_expiry');
            accessToken = null;
            
            // Try to revoke token if possible
            if (gapi && gapi.auth2) {
                const authInstance = gapi.auth2.getAuthInstance();
                if (authInstance) {
                    await authInstance.signOut();
                }
            }
            
            return true;
        } catch (error) {
            console.error('[gcal] Sign out error:', error);
            return false;
        }
    },
    isSignedIn: function() {
        try {
            // First check if we have an access token in localStorage
            const accessToken = localStorage.getItem('gcal_access_token');
            const tokenExpiry = localStorage.getItem('gcal_token_expiry');
            
            if (accessToken && tokenExpiry) {
                const expiryDate = new Date(tokenExpiry);
                if (expiryDate > new Date()) {
                    return true;
                } else {
                    // Token expired, clean up
                    localStorage.removeItem('gcal_access_token');
                    localStorage.removeItem('gcal_token_expiry');
                }
            }
            
            // If not, check gapi if available
            if (gapi?.auth2) {
                const authInstance = gapi.auth2.getAuthInstance();
                if (authInstance?.isSignedIn?.get()) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('[gcal] Error checking sign-in status:', error);
            return false;
        }
    },
    createEvent: async function(event) {
        try {
            console.log('[gcal] Creating calendar event...');
            console.log('[gcal] Event data received:', event);
            
            // Validate event object
            if (!event || !event.summary) {
                throw new Error('Invalid event object: missing summary (title)');
            }
            
            // Make sure the user is signed in
            if (!this.isSignedIn()) {
                console.log('[gcal] User not signed in, attempting to sign in');
                await this.signIn();
                
                // Check again after sign-in attempt
                if (!this.isSignedIn()) {
                    throw new Error('You must be signed in to Google Calendar to create events');
                }
            }
            
            // Ensure the API is initialized
            await loadGapiClient();
            
            if (!gapi.client?.calendar) {
                console.error('[gcal] Calendar API not available');
                throw new Error('Calendar API not available. Please try again later.');
            }
            
            // Set the access token
            const token = localStorage.getItem('gcal_access_token');
            if (token) {
                gapi.client.setToken({ access_token: token });
            } else {
                console.warn('[gcal] No access token found in localStorage');
            }
            
            // Validate and format the event data
            const validatedEvent = {
                summary: event.summary,
                description: event.description || 'Task from QuickNotes AI',
                start: event.start || {
                    dateTime: new Date().toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: event.end || {
                    dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                reminders: event.reminders || {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 30 },
                        { method: 'email', minutes: 60 }
                    ]
                }
            };
            
            // Add extended properties if provided
            if (event.extendedProperties) {
                validatedEvent.extendedProperties = event.extendedProperties;
            }
            
            console.log('[gcal] Validated event data:', validatedEvent);
            console.log('[gcal] Sending event to Google Calendar:', validatedEvent.summary);
            
            // Create the event
            const insertParams = {
                calendarId: 'primary',
                resource: validatedEvent
            };
            
            // Add conference data version if conference data is present
            if (event.conferenceData) {
                insertParams.conferenceDataVersion = 1;
            }
            
            console.log('[gcal] Insert parameters:', insertParams);
            
            const response = await gapi.client.calendar.events.insert(insertParams);
            
            console.log('[gcal] Event created successfully:', response.result.htmlLink);
            return response.result;
        } catch (error) {
            console.error('[gcal] Error creating event:', error);
            console.error('[gcal] Error details:', {
                status: error.status,
                message: error.message,
                result: error.result
            });
            
            // Provide more specific error messages
            if (error.status === 400) {
                throw new Error('Invalid request to Google Calendar API. Please check your event data.');
            } else if (error.status === 401) {
                throw new Error('Authentication expired. Please sign in again.');
            } else if (error.status === 403) {
                throw new Error('Permission denied. Please check your calendar permissions.');
            } else if (error.status === 404) {
                throw new Error('Calendar not found.');
            } else {
                throw error;
            }
        }
    },
    fetchEvents: async function(maxResults = 10) {
        try {
            if (!gapi || !gapi.client || !gapi.client.calendar) {
                await this.initGoogleCalendarApi();
            }
            
            // Set the access token
            const token = localStorage.getItem('gcal_access_token');
            if (token) {
                gapi.client.setToken({ access_token: token });
            }
            
            const now = new Date().toISOString();
            const response = await gapi.client.calendar.events.list({
                calendarId: 'primary',
                timeMin: now,
                showDeleted: false,
                singleEvents: true,
                maxResults,
                orderBy: 'startTime',
            });
            
            return response.result.items;
        } catch (error) {
            console.error('[gcal] Error fetching events:', error);
            throw error;
        }
    },
    createRecurringEvent: async function(task, syncDuration = '1month') {
        try {
            console.log('[gcal] Creating recurring calendar event...');
            
            // Make sure the user is signed in
            if (!this.isSignedIn()) {
                console.log('[gcal] User not signed in, attempting to sign in');
                await this.signIn();
                
                // Check again after sign-in attempt
                if (!this.isSignedIn()) {
                    throw new Error('You must be signed in to Google Calendar to create events');
                }
            }
            
            // Ensure the API is initialized
            await loadGapiClient();
            
            if (!gapi.client?.calendar) {
                console.error('[gcal] Calendar API not available');
                throw new Error('Calendar API not available. Please try again later.');
            }
            
            // Set the access token
            const token = localStorage.getItem('gcal_access_token');
            if (token) {
                gapi.client.setToken({ access_token: token });
            }
            
            // Use the existing addRecurringTaskToGcal function
            console.log('[gcal] Calling addRecurringTaskToGcal with duration:', syncDuration);
            const result = await addRecurringTaskToGcal(task, syncDuration);
            
            console.log('[gcal] Recurring event created successfully');
            return result;
        } catch (error) {
            console.error('[gcal] Error creating recurring event:', error);
            
            // Provide more specific error messages
            if (error.status === 401) {
                throw new Error('Authentication expired. Please sign in again.');
            } else if (error.status === 403) {
                throw new Error('Permission denied. Please check your calendar permissions.');
            } else if (error.status === 404) {
                throw new Error('Calendar not found.');
            } else {
                throw error;
            }
        }
    }
};

// Initialize on script load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[gcal] Script loaded, ready for initialization');
});
