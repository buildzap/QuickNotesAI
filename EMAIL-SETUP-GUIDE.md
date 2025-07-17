# Email Setup Guide for QuickNotesAI

## Current Status
Your email functionality is currently running in **mock mode** - it simulates sending emails but doesn't actually send them.

## To Enable Real Email Sending

### Option 1: MailerSend (Recommended)

1. **Sign up for MailerSend**:
   - Go to [MailerSend.com](https://mailersend.com)
   - Create a free account (12,000 emails/month free)

2. **Get your API Key**:
   - Go to API → API Keys
   - Create a new API key with "Email" permissions
   - Copy the API key

3. **Verify your sender domain**:
   - Go to Domains → Add Domain
   - Add and verify your domain
   - Or use the default MailerSend domain for testing

4. **Set up environment variables**:
   Create a `.env` file in the QuickNotesAI-SLN directory:
   ```
   MAILERSEND_API_KEY=mlsn.866e859c734fce02984d3c484421ea648135a0a0a115f52676df5dbb0f74472a
   MAILERSEND_FROM_EMAIL=test-86org8e5zo1gew13.mlsender.net
   ```

5. **Install dotenv** (for environment variables):
   ```bash
   npm install dotenv
   ```

6. **Restart the server**:
   ```bash
   node server.js
   ```

### Option 2: Gmail SMTP (Alternative)

If you prefer to use Gmail, you can configure SMTP instead:

1. **Enable 2-factor authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"

3. **Install nodemailer**:
   ```bash
   npm install nodemailer
   ```

4. **Configure in server.js** (replace SendGrid section)

## Testing Email Functionality

1. **Check server logs** when sending an email:
   - If you see "MailerSend configured successfully" → Real emails will be sent
   - If you see "MailerSend not available, using mock mode" → Still in mock mode

2. **Test the email API**:
   - Go to your dashboard
   - Try sharing a summary
   - Check the server console for detailed logs

## Troubleshooting

### MailerSend Issues:
- **API Key Invalid**: Double-check your API key
- **Domain Not Verified**: Verify your domain in MailerSend
- **Rate Limits**: Free tier allows 12,000 emails/month
- **Sender Email**: Must be from a verified domain

### Mock Mode (Current):
- Emails are simulated but not actually sent
- Perfect for development and testing
- No external dependencies required

## Current Configuration

Your server is currently running with:
- ✅ MailerSend package installed
- ❌ MailerSend API key not configured
- ✅ Mock mode as fallback
- ✅ Beautiful HTML email templates ready

## Next Steps

1. **For Development/Testing**: Keep using mock mode
2. **For Production**: Set up SendGrid following the steps above
3. **For Immediate Testing**: The mock mode will show you exactly what the emails would look like

The email templates are already beautifully designed with your app's branding and will work perfectly once you configure a real email service! 

[Email] MailerSend configured successfully 