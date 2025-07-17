# QuickNotes AI - Complete Testing Script

## 🎯 **Phase 1: Authentication Testing**

### Step 1: Index Page Navigation
1. **Open** `index.html` in your browser
2. **Verify** the landing page loads correctly
3. **Check** all navigation links work:
   - "Get Started" button → should redirect to login
   - "Login" link → should go to login page
   - "Premium" link → should go to premium page
4. **Test** responsive design on mobile/tablet

### Step 2: Google Login
1. **Navigate** to `login.html`
2. **Click** "Sign in with Google" button
3. **Complete** Google OAuth flow
4. **Verify** successful redirect to `task.html`
5. **Check** user email appears in navbar
6. **Verify** user role is set to "free" initially

### Step 3: Email/Password Registration
1. **Go back** to `login.html`
2. **Click** "Sign up" tab
3. **Fill** registration form:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
4. **Submit** form
5. **Verify** account creation and redirect to tasks

### Step 4: Email/Password Login
1. **Sign out** using navbar button
2. **Go to** login page
3. **Enter** credentials from step 3
4. **Verify** successful login and redirect

### Step 5: Session Management
1. **Refresh** the page
2. **Verify** user stays logged in
3. **Close** browser tab
4. **Reopen** and navigate to task page
5. **Verify** session persists

---

## 🎯 **Phase 2: Task Management Testing**

### Step 6: Voice Input Testing
1. **Navigate** to `task.html`
2. **Click** the voice command button (microphone icon)
3. **Allow** microphone permissions
4. **Speak** a task: "Add new task called buy groceries"
5. **Verify** voice transcription appears in title field
6. **Test** voice commands:
   - "Set priority to high"
   - "Set due date to tomorrow"
   - "Save task"

### Step 7: Manual Task Creation
1. **Fill** task form manually:
   - Title: "Test Manual Task"
   - Description: "This is a test task created manually"
   - Priority: High
   - Due Date: Tomorrow
   - Status: In Progress
   - Tags: test, manual
2. **Submit** form
3. **Verify** task appears in task list
4. **Check** task details are correct

### Step 8: Task Management Operations
1. **Click** on a task in the list
2. **Verify** task selection (highlighted)
3. **Test** task completion toggle
4. **Edit** task details
5. **Delete** a task
6. **Verify** real-time updates

### Step 9: Task Filtering & Search
1. **Create** multiple tasks with different priorities
2. **Test** priority filter dropdown
3. **Test** status filter dropdown
4. **Test** date filter dropdown
5. **Test** title search functionality
6. **Verify** filters work correctly

---

## 🎯 **Phase 3: Premium Features Testing**

### Step 10: Google Calendar Integration
1. **Navigate** to Google Calendar section (bottom of task page)
2. **Click** "Connect Google Calendar" button
3. **Complete** OAuth2 flow with Google
4. **Verify** connection status shows "Connected"
5. **Check** disconnect button appears

### Step 11: Task Sync to Calendar
1. **Select** a task from the task list
2. **Click** "Sync Selected Task" button
3. **Verify** task appears in your Google Calendar
4. **Check** sync history shows the sync
5. **Verify** task is marked as synced in Firestore

### Step 12: Smart Daily Digest (Premium Only)
1. **Navigate** to `dashboard.html`
2. **Complete** some tasks to generate data
3. **Look** for "Smart Daily Digest" section
4. **Click** "Refresh Digest" button
5. **Verify** AI-generated insights appear
6. **Check** mood indicator and insights

### Step 13: Task Auto-categorization (Premium Only)
1. **Go back** to `task.html`
2. **Create** a new task with title: "Review quarterly reports"
3. **Leave** priority and tags empty
4. **Submit** form
5. **Verify** AI suggests category, priority, and tags
6. **Check** toast notification shows suggestions

---

## 🎯 **Phase 4: Dashboard Testing**

### Step 14: Analytics Dashboard
1. **Navigate** to `dashboard.html`
2. **Verify** all charts load correctly:
   - Task Completion Trend
   - Input Methods Distribution
   - Most Productive Hours (Premium)
   - Task Categories (Premium)
3. **Check** real-time data updates
4. **Test** chart responsiveness

### Step 15: Data Export
1. **Click** "Export to CSV" button
2. **Verify** CSV file downloads with task data
3. **Click** "Export to PDF" button (Premium)
4. **Verify** PDF generates with charts and data
5. **Check** export file format and content

### Step 16: Premium Features Visibility
1. **Verify** free user sees upgrade prompts
2. **Check** premium charts show "Pro" badges
3. **Test** premium features are locked for free users
4. **Verify** premium user sees all features unlocked

---

## 🎯 **Phase 5: Premium Upgrade Testing**

### Step 17: Premium Upgrade Flow
1. **Navigate** to `premium.html`
2. **Review** feature comparison
3. **Click** "Subscribe Now" button
4. **Complete** Razorpay test payment:
   - Use test card: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits
5. **Verify** payment success
6. **Check** user role updates to "premium"
7. **Verify** premium features unlock

### Step 18: Post-Upgrade Testing
1. **Refresh** all pages
2. **Verify** premium badge appears
3. **Test** all premium features work:
   - Google Calendar sync
   - Smart Daily Digest
   - Task auto-categorization
   - Advanced analytics
4. **Check** upgrade button disappears

---

## 🎯 **Phase 6: Error Handling Testing**

### Step 19: Network Error Handling
1. **Disconnect** internet connection
2. **Try** to create a task
3. **Verify** appropriate error message
4. **Reconnect** internet
5. **Verify** app recovers gracefully

### Step 20: Permission Testing
1. **Deny** microphone permissions
2. **Try** voice input
3. **Verify** helpful error message
4. **Test** fallback to manual input

### Step 21: Google Calendar Error Handling
1. **Disconnect** Google Calendar
2. **Try** to sync a task
3. **Verify** error message and reconnection prompt
4. **Reconnect** and test sync again

---

## 🎯 **Phase 7: Cross-Browser Testing**

### Step 22: Browser Compatibility
1. **Test** in Chrome (primary)
2. **Test** in Firefox
3. **Test** in Safari
4. **Test** in Edge
5. **Verify** all features work consistently

### Step 23: Mobile Testing
1. **Open** app on mobile device
2. **Test** responsive design
3. **Verify** touch interactions work
4. **Check** voice input on mobile
5. **Test** mobile navigation

---

## 📊 **Testing Results Template**

```
Test Date: _______________
Tester: _________________

✅ PASSED TESTS:
- [ ] Authentication
- [ ] Navigation
- [ ] Task Management
- [ ] Voice Input
- [ ] Google Calendar
- [ ] Premium Features
- [ ] Dashboard
- [ ] Export Functions
- [ ] Error Handling
- [ ] Mobile Responsive

❌ FAILED TESTS:
- [ ] Issue 1: ________________
- [ ] Issue 2: ________________

🔧 ISSUES FOUND:
1. ________________
2. ________________

📝 NOTES:
- Performance: Good/Average/Poor
- UI/UX: Excellent/Good/Needs Improvement
- Overall: Ready for Production/Needs Fixes
```

## 🚨 **Common Issues & Solutions**

### Issue 1: Google Calendar Not Connecting
**Solution:** Check OAuth2 credentials and authorized origins

### Issue 2: Voice Input Not Working
**Solution:** Ensure HTTPS or localhost, check microphone permissions

### Issue 3: Premium Features Not Unlocking
**Solution:** Verify Razorpay webhook is configured correctly

### Issue 4: Charts Not Loading
**Solution:** Check Chart.js CDN and internet connection

### Issue 5: Firebase Errors
**Solution:** Verify Firebase configuration and security rules

## 🎉 **Success Criteria**

✅ All authentication flows work
✅ Voice input functions properly
✅ Task management is fully functional
✅ Google Calendar sync works
✅ Premium features unlock after payment
✅ Dashboard shows real-time data
✅ Export functions work
✅ Mobile responsive design
✅ Error handling is graceful
✅ Cross-browser compatibility

**If all criteria are met, your QuickNotes AI application is ready for production! 🚀** 