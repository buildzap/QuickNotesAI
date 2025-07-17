/**
 * Google Calendar Configuration
 * 
 * To set up Google Calendar integration:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Create a new project or select existing project
 * 3. Enable Google Calendar API
 * 4. Create OAuth 2.0 credentials (Client ID)
 * 5. Create API Key
 * 6. Add your domain to authorized origins
 * 7. Update the configuration below
 */

// Google Calendar Configuration
window.googleConfig = {
    // OAuth 2.0 Client ID from Google Cloud Console
    clientId: '130886081901-rl6m42a8t5b549jq797eh8b86q8ikncu.apps.googleusercontent.com',
    
    // API Key from Google Cloud Console
    apiKey: 'AIzaSyBTCFOAU1zLTSkZtk_mWNhNKGJMSpkwLIU', // Replace with your actual API key
    
    // Calendar API scopes
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    
    // Discovery document for Calendar API
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    
    // Authorized domains (add your production domain here)
    authorizedDomains: [
        'localhost', 
        '127.0.0.1', 
        'quicknoteai-77.firebaseapp.com',
        'your-production-domain.com' // Replace with your actual domain
    ],
    
    // Redirect URIs for OAuth (these should match Google Cloud Console)
    redirectUris: [
        'http://localhost:5500/QuickNotesAI-SLN/task.html',
        'http://localhost:5500/QuickNotesAI-SLN/',
        'http://localhost:5500/',
        'http://127.0.0.1:5500/QuickNotesAI-SLN/task.html',
        'http://127.0.0.1:5500/QuickNotesAI-SLN/',
        'http://127.0.0.1:5500/',
        'http://localhost:8001/QuickNotesAI-SLN/task.html',
        'http://localhost:8001/QuickNotesAI-SLN/',
        'http://localhost:8001/',
        'http://127.0.0.1:8001/QuickNotesAI-SLN/task.html',
        'http://127.0.0.1:8001/QuickNotesAI-SLN/',
        'http://127.0.0.1:8001/'
    ]
};

// Configuration validation with enhanced error detection
function validateGoogleConfiguration() {
    const issues = [];
    
    // Check if configuration exists
    if (!window.googleConfig) {
        issues.push('Google configuration not found');
        return { isValid: false, issues };
    }
    
    // Validate Client ID
    if (!window.googleConfig.clientId || 
        window.googleConfig.clientId === 'YOUR_CLIENT_ID' ||
        window.googleConfig.clientId.includes('example')) {
        issues.push('Google Client ID not configured properly');
    }
    
    // Validate API Key
    if (!window.googleConfig.apiKey || 
        window.googleConfig.apiKey === 'YOUR_API_KEY' ||
        window.googleConfig.apiKey.includes('example')) {
        issues.push('Google API Key not configured properly');
    }
    
    // Check domain authorization with proper null checks
    const currentDomain = window.location.hostname;
    const authorizedDomains = window.googleConfig.authorizedDomains || [];
    
    if (!Array.isArray(authorizedDomains) || authorizedDomains.length === 0) {
        issues.push('No authorized domains configured');
    } else if (!authorizedDomains.includes(currentDomain)) {
        issues.push(`Domain '${currentDomain}' not authorized. Add it to authorizedDomains array.`);
    }
    
    return {
        isValid: issues.length === 0,
        issues: issues
    };
}

// Enhanced error display with specific 403 error guidance
function showGoogleConfigurationError(issues) {
    const statusDiv = document.getElementById('gcal-status');
    if (statusDiv) {
        let errorMessage = issues.length > 0 ? 
            `Google Calendar not configured: ${issues.join(', ')}` :
            'Google Calendar configuration error';
        
        // Check for specific 403 error patterns
        const has403Error = issues.some(issue => 
            issue.includes('403') || 
            issue.includes('Forbidden') || 
            issue.includes('access denied')
        );
        
        let troubleshootingSteps = '';
        if (has403Error) {
            troubleshootingSteps = `
                <br><br>
                <strong>403 Error - API Access Denied</strong><br>
                <small class="text-muted">
                    <strong>To fix 403 errors:</strong><br>
                    1. Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a><br>
                    2. Select your project<br>
                    3. Go to "APIs & Services" > "Library"<br>
                    4. Search for "Google Calendar API" and enable it<br>
                    5. Go to "APIs & Services" > "Credentials"<br>
                    6. Edit your API Key<br>
                    7. Under "API restrictions", select "Google Calendar API"<br>
                    8. Under "Application restrictions", add your domain: ${window.location.hostname}<br>
                    9. Save the changes<br>
                    10. Wait 5-10 minutes for changes to propagate
                </small>
            `;
        } else {
            troubleshootingSteps = `
                <br><br>
                <small class="text-muted">
                    <strong>To fix this:</strong><br>
                    1. Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a><br>
                    2. Enable Google Calendar API<br>
                    3. Create OAuth 2.0 credentials and API Key<br>
                    4. Add your domain to authorized origins<br>
                    5. Update the configuration in google-config.js
                </small>
            `;
        }
        
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Google Calendar Setup Required</strong>
                <br>
                ${errorMessage}
                ${troubleshootingSteps}
            </div>
        `;
        statusDiv.classList.remove('d-none');
    }
    
    console.error('[Google Config] Configuration validation failed:', issues);
}

// Export validation function
window.validateGoogleConfiguration = validateGoogleConfiguration;
window.showGoogleConfigurationError = showGoogleConfigurationError;

// Log configuration status on load
document.addEventListener('DOMContentLoaded', function() {
    const validation = validateGoogleConfiguration();
    if (!validation.isValid) {
        console.warn('[Google Config] Configuration issues detected:', validation.issues);
        showGoogleConfigurationError(validation.issues);
    } else {
        console.log('[Google Config] Configuration validated successfully');
    }
}); 