# Google Apps Script Setup for Smart Daily Digest

This guide will help you set up Google Apps Script to handle OpenAI API calls for the Smart Daily Digest feature, avoiding the need for Firebase Blaze plan.

## Prerequisites

1. **Google Account**: You need a Google account
2. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## Step-by-Step Setup

### Step 1: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Rename the project to "Smart Daily Digest"
4. Delete the default `Code.gs` content

### Step 2: Add the Script Code

1. Copy the entire content from `google-apps-script/openai-digest.gs`
2. Paste it into your Google Apps Script editor
3. Save the project (Ctrl+S or Cmd+S)

### Step 3: Configure OpenAI API Key

1. In the script editor, find the `setup()` function
2. Replace `'YOUR_OPENAI_API_KEY_HERE'` with your actual OpenAI API key:
   ```javascript
   const openaiApiKey = 'sk-your-actual-api-key-here';
   ```
3. Run the `setup()` function:
   - Click on the function dropdown (top right)
   - Select `setup`
   - Click the "Run" button
   - Grant necessary permissions when prompted

### Step 4: Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Choose "Web app" as the type
3. Configure the settings:
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone" (for public access)
4. Click "Deploy"
5. Copy the **Web App URL** - you'll need this for the next step

### Step 5: Test the Connection

1. In the script editor, run the `testDigestGeneration()` function
2. Check the execution log for any errors
3. If successful, you should see a test response

### Step 6: Update Your Application

1. Copy the Web App URL from Step 4
2. Update the `GOOGLE_APPS_SCRIPT_URL` in your `dashboard.js` file
3. The Smart Daily Digest will now use Google Apps Script instead of Firebase Functions

## Configuration in Your App

Update your `dashboard.js` file to use the Google Apps Script URL:

```javascript
// Replace this in your dashboard.js
const GOOGLE_APPS_SCRIPT_URL = 'YOUR_WEB_APP_URL_HERE';

// Update the generateSmartDigest function to use Google Apps Script
async function generateSmartDigest() {
    // ... existing validation code ...
    
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generateDigest',
                data: {
                    digestType: currentDigestType,
                    tasks: tasks // Your completed tasks array
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayDigestContent(result);
        } else {
            throw new Error(result.error || 'Failed to generate digest');
        }
    } catch (error) {
        // ... error handling ...
    }
}
```

## Security Considerations

1. **API Key Security**: The OpenAI API key is stored securely in Google Apps Script properties
2. **Access Control**: The web app is set to "Anyone" access, but you can restrict it if needed
3. **Rate Limiting**: Google Apps Script has quotas, but they're generous for this use case

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Make sure you ran the `setup()` function
   - Check that the API key is correct

2. **"CORS error"**
   - This is normal for Google Apps Script
   - The fetch request should still work

3. **"Quota exceeded"**
   - Google Apps Script has daily quotas
   - Check the execution logs for quota information

### Testing

1. **Test Connection**: Run `testDigestGeneration()` in the script editor
2. **Check Logs**: View execution logs for detailed error information
3. **Verify URL**: Make sure the Web App URL is correct and accessible

## Benefits of This Approach

✅ **No Firebase Blaze Plan Required**: Works with free Firebase plan  
✅ **Secure**: API key stored in Google Apps Script properties  
✅ **Reliable**: Google's infrastructure handles the API calls  
✅ **Free**: No additional costs beyond OpenAI API usage  
✅ **Scalable**: Handles multiple requests efficiently  

## Next Steps

1. Follow the setup guide above
2. Test the connection using the test function
3. Update your application code to use the Google Apps Script URL
4. Deploy and test the Smart Daily Digest feature

## Support

If you encounter any issues:
1. Check the Google Apps Script execution logs
2. Verify your OpenAI API key is valid
3. Ensure the Web App URL is accessible
4. Test with the provided test functions 