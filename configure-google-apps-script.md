# Configure Google Apps Script URL in Dashboard

## 🔧 **Step-by-Step Configuration**

### **Step 1: Get Your Google Apps Script Web App URL**

1. Go to your Google Apps Script project: [script.google.com](https://script.google.com)
2. Click on your "Smart Daily Digest" project
3. Click **"Deploy"** → **"Manage deployments"**
4. Find your web app deployment and click the **copy icon** next to the URL
5. The URL will look like: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`

### **Step 2: Update dashboard.js**

1. Open `js/dashboard.js` in your code editor
2. Find line 938 (around the top of the file):
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace the placeholder with your actual URL:
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec';
   ```
4. Save the file

### **Step 3: Test the Configuration**

1. Open your dashboard page
2. Try clicking the "Generate Smart Digest" button
3. Check the browser console for any errors
4. If successful, you should see the digest generation working

## 🧪 **Quick Test**

You can test your Google Apps Script URL directly:

1. **Open your web app URL** in a browser
2. You should see a JSON response like:
   ```json
   {
     "message": "Smart Daily Digest API is running",
     "status": "active",
     "timestamp": "2024-01-01T12:00:00.000Z",
     "instructions": "Use POST requests with action and data parameters"
   }
   ```

## 🔍 **Troubleshooting**

### **"Smart Digest service not configured"**
- Make sure you've updated the URL in `dashboard.js`
- Verify the URL is correct and accessible
- Check that your Google Apps Script is deployed as a web app

### **"Connection failed"**
- Ensure your Google Apps Script is set to "Anyone" access
- Check that the `setup()` function was run with your OpenAI API key
- Verify the script is deployed and active

### **"OpenAI API key not configured"**
- Run the `setup()` function in your Google Apps Script
- Make sure your OpenAI API key is correct
- Check the script properties in Google Apps Script

## 📝 **Example Configuration**

Here's what your `dashboard.js` should look like:

```javascript
// Smart Digest Variables
let currentDigestType = 'daily';
// Google Apps Script URL - Replace with your deployed web app URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/exec';
```

## ✅ **Verification Checklist**

- [ ] Google Apps Script project created
- [ ] Code copied from `google-apps-script/openai-digest.gs`
- [ ] `setup()` function run with OpenAI API key
- [ ] Web app deployed with "Anyone" access
- [ ] URL copied from deployment
- [ ] URL updated in `dashboard.js`
- [ ] Dashboard page refreshed
- [ ] Smart Digest button tested

## 🆘 **Need Help?**

If you're still having issues:
1. Check the browser console for error messages
2. Use the test page: `test-google-apps-script.html`
3. Verify your Google Apps Script execution logs
4. Make sure your OpenAI API key has credits available 