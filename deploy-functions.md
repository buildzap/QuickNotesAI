# Firebase Functions Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **OpenAI API Key**: Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

3. **Firebase Project**: Make sure you have a Firebase project set up

## Setup Steps

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase Functions (if not already done)
```bash
cd functions
npm install
```

### 3. Set OpenAI API Key
```bash
firebase functions:config:set openai.api_key="your-openai-api-key-here"
```

### 4. Install Dependencies
```bash
cd functions
npm install openai razorpay
```

### 5. Deploy Functions
```bash
firebase deploy --only functions
```

## Environment Variables

The following environment variables need to be set:

- `OPENAI_API_KEY`: Your OpenAI API key
- `RAZORPAY_KEY_ID`: Your Razorpay key ID (for payments)
- `RAZORPAY_KEY_SECRET`: Your Razorpay key secret (for payments)
- `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay webhook secret (for payments)

## Testing the Functions

### Test Smart Digest Function
```bash
# Test with curl (replace with your actual function URL)
curl -X POST https://your-region-your-project.cloudfunctions.net/getSmartDigest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"digestType": "daily"}'
```

### Test Digest History Function
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/getDigestHistory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"limit": 10}'
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Not Set**
   - Error: "OpenAI API key not configured"
   - Solution: Set the API key using `firebase functions:config:set openai.api_key="your-key"`

2. **Permission Denied**
   - Error: "Premium feature only"
   - Solution: Make sure the user has 'premium' role in Firestore

3. **Authentication Error**
   - Error: "User must be authenticated"
   - Solution: Ensure user is logged in and ID token is valid

### Logs
View function logs:
```bash
firebase functions:log
```

### Local Testing
Test functions locally:
```bash
firebase emulators:start --only functions
```

## Security Rules

Make sure your Firestore security rules allow access to the `digests` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read their own digests
    match /digests/{digestId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Only allow writes from Cloud Functions
    }
    
    // Allow users to read their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read their own tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Cost Considerations

- **OpenAI API**: Each digest generation costs approximately $0.002-0.005 depending on task count
- **Firebase Functions**: Free tier includes 125K invocations/month
- **Firestore**: Free tier includes 50K reads/day and 20K writes/day

## Monitoring

Monitor function usage and costs:
1. Firebase Console > Functions > Usage
2. OpenAI Platform > Usage
3. Set up alerts for high usage

## Production Checklist

- [ ] OpenAI API key configured
- [ ] Functions deployed successfully
- [ ] Security rules updated
- [ ] User roles properly set in Firestore
- [ ] Error handling tested
- [ ] Cost monitoring set up
- [ ] Performance tested with real data 