# Quick Setup: Google Apps Script for Smart Daily Digest

## 🚀 Quick Start (5 minutes)

### Step 1: Create Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Rename to "Smart Daily Digest"

### Step 2: Add Code
1. Delete default content in `Code.gs`
2. Copy entire content from `google-apps-script/openai-digest.gs`
3. Paste into the editor
4. Save (Ctrl+S)

### Step 3: Configure API Key
1. Find the `setup()` function
2. Replace `'YOUR_OPENAI_API_KEY_HERE'` with your actual key
3. Run the `setup()` function (dropdown → setup → Run)
4. Grant permissions when prompted

### Step 4: Deploy Web App
1. Click "Deploy" → "New deployment"
2. Choose "Web app"
3. Set "Execute as": "Me"
4. Set "Who has access": "Anyone"
5. Click "Deploy"
6. **Copy the Web App URL**

### Step 5: Update Your App
1. Open `js/dashboard.js`
2. Find line with `GOOGLE_APPS_SCRIPT_URL`
3. Replace the placeholder with your Web App URL
4. Save the file

### Step 6: Test
1. Open `test-google-apps-script.html` in your browser
2. Paste your Web App URL
3. Click "Test Connection"
4. If successful, try "Generate Sample Digest"

## ✅ Done!

Your Smart Daily Digest now works without Firebase Blaze plan!

## 🔧 Troubleshooting

**"OpenAI API key not configured"**
- Make sure you ran the `setup()` function
- Check the API key is correct

**"Connection failed"**
- Verify the Web App URL is correct
- Check that deployment is set to "Anyone" access

**"CORS error"**
- This is normal for Google Apps Script
- The fetch request should still work

## 📝 Next Steps

1. Test the integration using the test page
2. Update your dashboard.js with the correct URL
3. Try generating a digest from your dashboard
4. Monitor usage in Google Apps Script execution logs

## 💡 Benefits

- ✅ No Firebase Blaze plan required
- ✅ Secure API key storage
- ✅ Free to use
- ✅ Reliable Google infrastructure
- ✅ Easy to maintain and update 