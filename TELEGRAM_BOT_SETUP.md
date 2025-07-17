# 🔧 Telegram Bot Setup Guide

## 📋 Overview

This guide will help you set up the Telegram Voice Note → Task Transcription feature for QuickNotes AI. This feature allows premium users to send voice messages to a Telegram bot, which will automatically transcribe them and create tasks in their QuickNotes AI account.

## 🎯 Features

- **Voice-to-Task**: Send voice messages to create tasks instantly
- **Premium Only**: Restricted to premium users only
- **Secure Linking**: Secure account linking between Telegram and QuickNotes AI
- **AI Transcription**: Uses OpenAI Whisper for accurate transcription
- **Real-time Sync**: Tasks appear immediately in the web dashboard

## 🚀 Setup Steps

### 1. Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** to create a new bot
3. **Choose a name** for your bot (e.g., "QuickNotes AI Bot")
4. **Choose a username** (must end with 'bot', e.g., "quicknotes_ai_bot")
5. **Save the bot token** - you'll need this for configuration

### 2. Configure Environment Variables

Add these environment variables to your Firebase project:

```bash
# Firebase Functions Configuration
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN_HERE"
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY_HERE"
```

Or set them in your `.env` file:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
```

### 3. Set Webhook URL

After deploying your Firebase functions, set the webhook URL:

```bash
# Replace with your actual Firebase function URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/telegramWebhook"
     }'
```

### 4. Deploy Firebase Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 5. Test the Bot

1. **Find your bot** on Telegram using the username you created
2. **Send `/start`** to see the welcome message
3. **Send `/link`** to get a secure linking URL
4. **Click the link** to connect your Telegram account to QuickNotes AI
5. **Send a voice message** to test the transcription

## 🔐 Security Features

### Account Linking Security

- **Secure Tokens**: 32-character random tokens for linking
- **Time Expiration**: Tokens expire after 30 minutes
- **One-time Use**: Tokens can only be used once
- **Premium Verification**: Only premium users can link accounts

### Data Protection

- **Audio Deletion**: Audio files are deleted after transcription
- **Secure Storage**: All data stored in Firebase with proper security rules
- **User Isolation**: Users can only access their own data

## 📊 Firestore Structure

### Collections

```javascript
// Telegram user mappings
/telegram_users/{telegram_user_id} = {
  uid: "firebase_user_id",
  linkedAt: timestamp,
  name: "user_name",
  email: "user_email",
  telegramChatId: "chat_id"
}

// Linking tokens (temporary)
/telegram_linking_tokens/{token} = {
  telegramUserId: "telegram_user_id",
  chatId: "chat_id",
  createdAt: timestamp,
  expiresAt: timestamp,
  used: false
}

// User accounts
/users/{uid} = {
  name: "user_name",
  email: "user_email",
  role: "premium", // or "free"
  premiumSince: timestamp
}

// Tasks (existing structure)
/tasks/{uid}/userTasks/{taskId} = {
  title: "task_title",
  description: "task_description",
  status: "pending",
  source: "telegram",
  type: "voice",
  inputMethod: "voice",
  telegramCreated: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🛠️ Available Commands

### Bot Commands

- `/start` - Show welcome message and available commands
- `/help` - Show detailed help information
- `/link` - Get secure link to connect your account
- `/status` - Check your account and subscription status

### Voice Messages

- Send any voice message to create a task
- Supported formats: Voice messages (.ogg), Audio files (.mp3, .wav, .m4a)
- Maximum duration: 60 seconds (Telegram limit)
- Maximum file size: 25MB (OpenAI Whisper limit)

## 🔧 Configuration Options

### Firebase Functions Configuration

```javascript
// Set configuration
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"

// View configuration
firebase functions:config:get

// Remove configuration
firebase functions:config:unset telegram.bot_token
```

### Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for development)
NODE_ENV=development
```

## 🧪 Testing

### Test Cases

1. **Account Linking**
   - Test with premium user
   - Test with free user (should fail)
   - Test with expired token
   - Test with already used token

2. **Voice Transcription**
   - Test short voice message (< 10 seconds)
   - Test long voice message (30-60 seconds)
   - Test with background noise
   - Test with different languages

3. **Error Handling**
   - Test with invalid audio format
   - Test with file too large
   - Test with network errors
   - Test with OpenAI API errors

### Test Commands

```bash
# Test webhook locally
firebase emulators:start --only functions

# Test bot commands
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage" \
     -H "Content-Type: application/json" \
     -d '{
       "chat_id": "YOUR_CHAT_ID",
       "text": "/start"
     }'
```

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Not Working**
   - Check if webhook URL is correct
   - Verify bot token is valid
   - Check Firebase function logs

2. **Transcription Fails**
   - Verify OpenAI API key is valid
   - Check audio file format and size
   - Review Firebase function logs

3. **Account Linking Fails**
   - Ensure user has premium subscription
   - Check if token is expired
   - Verify Firebase security rules

### Debug Commands

```bash
# Check webhook status
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"

# View function logs
firebase functions:log --only telegramWebhook

# Test function locally
firebase emulators:start --only functions
```

## 📈 Monitoring

### Firebase Function Logs

Monitor these functions for errors:

- `telegramWebhook` - Main webhook handler
- `linkTelegramAccount` - Account linking
- `transcribeAudio` - Audio transcription
- `cleanupExpiredTokens` - Token cleanup

### Key Metrics

- Voice messages processed per day
- Transcription success rate
- Account linking success rate
- Error rates by function

## 🔄 Maintenance

### Scheduled Tasks

- **Token Cleanup**: Runs every 24 hours to remove expired tokens
- **Log Rotation**: Firebase automatically manages logs
- **Backup**: Firestore data is automatically backed up

### Updates

- **Dependencies**: Update npm packages regularly
- **Firebase SDK**: Keep Firebase SDK updated
- **Security**: Monitor for security updates

## 📞 Support

### Getting Help

1. **Check logs**: Use `firebase functions:log`
2. **Test locally**: Use Firebase emulators
3. **Review configuration**: Verify all environment variables
4. **Check documentation**: Review this guide and Firebase docs

### Useful Links

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

## ✅ Checklist

- [ ] Telegram bot created and token obtained
- [ ] Environment variables configured
- [ ] Firebase functions deployed
- [ ] Webhook URL set
- [ ] Account linking tested
- [ ] Voice transcription tested
- [ ] Error handling verified
- [ ] Security rules configured
- [ ] Monitoring set up
- [ ] Documentation updated

---

**Note**: This feature is only available for premium users. Make sure to test the premium user restriction thoroughly. 