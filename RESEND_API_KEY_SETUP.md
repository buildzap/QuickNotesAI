# Resend API Key Setup Guide

## ❌ Current Issue
The API key `re_5dq8thU2_Jgn7sYmMuXUc5K5kZ1WbC9jU` is **invalid** (401 error). You need to get a new valid API key.

## ✅ How to Get a Valid API Key

### Step 1: Sign up for Resend
1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" and create an account
3. Verify your email address

### Step 2: Get Your API Key
1. After logging in, go to your **Dashboard**
2. Click on **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
4. Give it a name like "QuickNotesAI"
5. Copy the generated API key (starts with `re_`)

### Step 3: Update Your Configuration

#### Option A: Environment Variable (Recommended)
1. Create a `.env` file in your project root:
```bash
RESEND_API_KEY=your_new_api_key_here
```

#### Option B: Direct Update
1. Open `server.js`
2. Replace the API key on line 20:
```javascript
resendApiKey = 'your_new_api_key_here';
```

### Step 4: Test the Configuration
1. Restart your server
2. Visit: `http://localhost:5500/email-diagnostic.html`
3. Click "Test Configuration" to verify

## 🔧 Alternative: Use Environment Variable

If you want to use environment variables (recommended for security):

1. **Create `.env` file** in your project root:
```
RESEND_API_KEY=your_new_api_key_here
```

2. **Install dotenv** (if not already installed):
```bash
npm install dotenv
```

3. **The server will automatically use the environment variable**

## 🚨 Important Notes

- **Never commit API keys to version control**
- **Use environment variables for production**
- **The `onboarding@resend.dev` domain is verified and ready to use**
- **You can send up to 100 emails/day on the free plan**

## 📧 Test Your Setup

After getting a new API key:

1. **Restart your server**
2. **Visit**: `http://localhost:5500/email-diagnostic.html`
3. **Click "Test Configuration"** - should show success
4. **Click "Send Test Email"** - should send a real email

## 🆘 Still Having Issues?

If you continue to have problems:

1. **Check your Resend dashboard** for any account issues
2. **Verify the API key** is copied correctly
3. **Check your internet connection**
4. **Contact Resend support** if needed

---

**Current Status**: ❌ API Key Invalid - Needs Replacement 