# Razorpay Test Payment Guide

## 🚨 Issue: "International cards are not supported"

### Root Cause
This error occurs because you're using a **Razorpay test account** (`rzp_test_*`), which has restrictions:
- ✅ **Only Indian cards are allowed** in test mode
- ❌ **International cards are blocked** for security reasons
- 🔒 **Test environment limitations** prevent international card processing

### ✅ Solution: Use Razorpay Test Cards

#### Successful Payment Test Card
```
Card Number: 4111 1111 1111 1111
Expiry Date: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
Cardholder Name: Any name
Result: ✅ Payment will succeed
```

#### Failed Payment Test Card
```
Card Number: 4000 0000 0000 0002
Expiry Date: Any future date
CVV: Any 3 digits
Result: ❌ Payment will fail (for testing error handling)
```

## 🧪 Testing Steps

### 1. Use the Test Payment Page
Navigate to: `http://localhost:5500/test-payment.html`

This page provides:
- Clear test card information
- Separate buttons for success/failure testing
- Real-time status updates
- Authentication verification

### 2. Test from Premium Page
Navigate to: `http://localhost:5500/premium.html`

The enhanced payment flow now:
- Shows test card information before payment
- Provides clear instructions for test mode
- Handles international card errors gracefully

## 🔧 Enhanced Error Handling

The payment system now includes:

### Pre-Payment Warning
```javascript
// Shows test card info before opening payment modal
const useTestCards = confirm(`🧪 TEST MODE DETECTED

You're using Razorpay test environment. Only Indian test cards are supported.

✅ Use this test card for successful payment:
   Card: 4111 1111 1111 1111
   Expiry: Any future date
   CVV: Any 3 digits

❌ International cards will be rejected.

Click OK to proceed with test payment.`);
```

### Enhanced Error Messages
```javascript
rzp.on('payment.failed', function (response) {
    if (response.error.description.includes('International cards')) {
        alert(`❌ International cards are not supported in test mode.

🔧 SOLUTION: Use these Razorpay test cards:

✅ SUCCESSFUL PAYMENT:
Card: 4111 1111 1111 1111
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
Name: Any name

❌ FAILED PAYMENT:
Card: 4000 0000 0000 0002
Expiry: Any future date
CVV: Any 3 digits

⚠️ Note: Only Indian cards work in Razorpay test environment.`);
    }
});
```

## 🌐 Production vs Test Environment

### Test Environment (Current)
- **Key ID**: `rzp_test_joQDkSFqA4rIId`
- **Restrictions**: Indian cards only
- **Purpose**: Development and testing
- **Charges**: No real money

### Production Environment (When Ready)
- **Key ID**: `rzp_live_*` (from Razorpay dashboard)
- **Restrictions**: All cards supported
- **Purpose**: Real payments
- **Charges**: Real money

## 📋 Testing Checklist

### ✅ Before Testing
- [ ] User is authenticated
- [ ] Server is running (`node server.js`)
- [ ] Firebase is configured
- [ ] Razorpay script is loaded

### ✅ Test Scenarios
- [ ] **Successful Payment**: Use `4111 1111 1111 1111`
- [ ] **Failed Payment**: Use `4000 0000 0000 0002`
- [ ] **International Card**: Should show helpful error message
- [ ] **User Upgrade**: Verify user role changes to 'premium'
- [ ] **Error Handling**: Verify graceful error messages

### ✅ Expected Results
- [ ] Test cards work as expected
- [ ] International cards show helpful error
- [ ] User gets upgraded to premium on success
- [ ] No real money is charged
- [ ] Error messages are user-friendly

## 🚀 Moving to Production

When ready to accept real payments:

1. **Get Production Keys**:
   - Log into Razorpay Dashboard
   - Go to Settings → API Keys
   - Generate production keys

2. **Update Configuration**:
   ```javascript
   // Change from test to production
   const RAZORPAY_KEY_ID = 'rzp_live_your_production_key';
   ```

3. **Test Production**:
   - Use real cards for testing
   - Verify webhook handling
   - Test refund scenarios

## 🔍 Troubleshooting

### Common Issues

#### Issue: "International cards are not supported"
**Solution**: Use test card `4111 1111 1111 1111`

#### Issue: Payment modal doesn't open
**Solution**: Check if Razorpay script is loaded

#### Issue: User not upgraded after payment
**Solution**: Check Firebase configuration and permissions

#### Issue: Test cards not working
**Solution**: Verify you're using the correct test environment

### Debug Steps
1. Check browser console for errors
2. Verify Firebase authentication
3. Confirm Razorpay key is correct
4. Test with provided test cards
5. Check server logs for errors

## 📞 Support

If you continue to have issues:
1. Check this guide first
2. Use the test payment page
3. Verify all configurations
4. Test with provided test cards

Remember: **Test environment = Test cards only!** 