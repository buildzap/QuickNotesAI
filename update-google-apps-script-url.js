/**
 * Simple script to update Google Apps Script URL in dashboard.js
 * Usage: node update-google-apps-script-url.js "YOUR_WEB_APP_URL"
 */

const fs = require('fs');
const path = require('path');

function updateGoogleAppsScriptUrl(newUrl) {
    const dashboardPath = path.join(__dirname, 'js', 'dashboard.js');
    
    try {
        // Read the current dashboard.js file
        let content = fs.readFileSync(dashboardPath, 'utf8');
        
        // Check if the URL is already configured
        if (content.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
            // Replace the placeholder with the new URL
            const updatedContent = content.replace(
                /const GOOGLE_APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';/,
                `const GOOGLE_APPS_SCRIPT_URL = '${newUrl}';`
            );
            
            // Write the updated content back to the file
            fs.writeFileSync(dashboardPath, updatedContent, 'utf8');
            
            console.log('✅ Successfully updated Google Apps Script URL in dashboard.js');
            console.log(`📝 New URL: ${newUrl}`);
            console.log('🔄 Please refresh your dashboard page to see the changes');
            
        } else {
            console.log('⚠️  Google Apps Script URL appears to already be configured');
            console.log('📝 Current URL in file:');
            
            // Extract current URL from file
            const match = content.match(/const GOOGLE_APPS_SCRIPT_URL = '([^']+)';/);
            if (match) {
                console.log(`   ${match[1]}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating dashboard.js:', error.message);
        console.log('💡 Make sure you\'re running this script from the QuickNotesAI-SLN directory');
    }
}

// Get URL from command line argument
const newUrl = process.argv[2];

if (!newUrl) {
    console.log('📋 Usage: node update-google-apps-script-url.js "YOUR_WEB_APP_URL"');
    console.log('');
    console.log('🔗 Example:');
    console.log('   node update-google-apps-script-url.js "https://script.google.com/macros/s/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/exec"');
    console.log('');
    console.log('📝 To get your Web App URL:');
    console.log('   1. Go to script.google.com');
    console.log('   2. Open your Smart Daily Digest project');
    console.log('   3. Click Deploy → Manage deployments');
    console.log('   4. Copy the Web App URL');
    process.exit(1);
}

// Validate URL format
if (!newUrl.startsWith('https://script.google.com/macros/s/')) {
    console.log('⚠️  Warning: URL doesn\'t look like a Google Apps Script Web App URL');
    console.log('   Expected format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
    console.log('');
}

updateGoogleAppsScriptUrl(newUrl); 