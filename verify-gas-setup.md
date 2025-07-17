# 🔍 Verify Google Apps Script Setup

## **The Problem**
You're getting this error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

This means your Google Apps Script is returning HTML instead of JSON, which indicates one of these issues:

## **Step-by-Step Verification**

### **Step 1: Test the Debug Page**
1. Open: `http://localhost:5500/debug-gas-url.html`
2. Click "Test Direct GET" and "Test Direct POST"
3. Tell me what you see in the results

### **Step 2: Verify Google Apps Script URL**
1. Go to [script.google.com](https://script.google.com)
2. Open your "Smart Daily Digest" project
3. Click **"Deploy"** → **"Manage deployments"**
4. Copy the **exact URL** from your web app deployment
5. Compare it with: `https://script.google.com/macros/s/AKfycbyQ6OToO0N6eIQgLFydl4z4gzikyFW5H-mEAfXtdwxvKVsNTOl65npHd4w86IEntzfZ/exec`

### **Step 3: Test the URL Directly**
1. Open your Google Apps Script URL in a new browser tab
2. You should see JSON like this:
   ```json
   {
     "message": "Smart Daily Digest API is running",
     "status": "active",
     "timestamp": "2024-01-01T12:00:00.000Z",
     "instructions": "Use POST requests with action and data parameters"
   }
   ```
3. If you see HTML or an error page, the script isn't working

### **Step 4: Check Google Apps Script Code**
1. In your Google Apps Script editor, make sure you have:
   - The `doGet()` function (for GET requests)
   - The `doPost()` function (for POST requests)
   - The `setup()` function has been run with your OpenAI API key

### **Step 5: Verify Deployment Settings**
1. In "Manage deployments", check:
   - **Type:** Web app
   - **Execute as:** Me
   - **Who has access:** Anyone
   - **Version:** Latest version

## **Common Issues & Fixes**

### **Issue 1: Wrong URL**
**Symptoms:** Different URL in deployment vs. code
**Fix:** Update the URL in `server.js`

### **Issue 2: Script not deployed**
**Symptoms:** URL returns 404 or error page
**Fix:** Deploy the script as a web app

### **Issue 3: OpenAI API key not configured**
**Symptoms:** Script returns error about API key
**Fix:** Run the `setup()` function in Google Apps Script

### **Issue 4: Script has errors**
**Symptoms:** Script returns HTML error page
**Fix:** Check execution logs in Google Apps Script

### **Issue 5: CORS issues**
**Symptoms:** Browser blocks the request
**Fix:** Use the proxy endpoint (already implemented)

## **Quick Test Commands**

### **Test 1: Direct URL Test**
Open this URL in your browser:
```
https://script.google.com/macros/s/AKfycbyQ6OToO0N6eIQgLFydl4z4gzikyFW5H-mEAfXtdwxvKVsNTOl65npHd4w86IEntzfZ/exec
```

### **Test 2: Proxy Test**
Open this URL in your browser:
```
http://localhost:5500/api/test-gas
```

### **Test 3: Debug Page**
Open this URL in your browser:
```
http://localhost:5500/debug-gas-url.html
```

## **What to Tell Me**

After running these tests, please tell me:

1. **What you see when you open the Google Apps Script URL directly**
2. **What the debug page shows for each test**
3. **Whether the URLs match between your deployment and the code**
4. **Any error messages you see in Google Apps Script execution logs**

This will help me identify exactly what's wrong and provide the right fix! 