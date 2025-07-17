# Team Collaboration - End-to-End Testing Guide

## 🧪 Testing Overview

This guide provides step-by-step instructions to test the complete team collaboration functionality in QuickNotes AI. Test both premium and free user scenarios to ensure proper feature gating and functionality.

## 📋 Prerequisites

### 1. Firebase Setup
- Ensure Firebase project is configured
- Verify Firestore database is accessible
- Check that security rules are deployed

### 2. Test Users
Create at least 2 test accounts:
- **Premium User 1**: `premium1@test.com` (Team Creator)
- **Premium User 2**: `premium2@test.com` (Team Member)
- **Free User**: `free@test.com` (For access control testing)

### 3. Browser Setup
- Use Chrome/Firefox with developer tools
- Clear browser cache and local storage
- Open browser console for debugging

## 🎯 Test Scenarios

### Scenario 1: Premium User - Team Creation Flow

#### Step 1: Login as Premium User
1. Navigate to `http://localhost:5500/login.html`
2. Login with premium user credentials
3. Verify user role shows "Premium" badge in navbar

#### Step 2: Access Team Page
1. Click "Team" in navigation
2. **Expected**: Should see team creation/joining options
3. **Not Expected**: Premium required message

#### Step 3: Create Team
1. Enter team name: "Test Team Alpha"
2. Click "Create Team"
3. **Expected**: Success message with team code (e.g., "ABC12345")
4. **Verify**: Team code is 8 characters, alphanumeric

#### Step 4: Verify Team Creation
1. Check Firebase Console → Firestore → `teams` collection
2. **Expected**: New team document with:
   - `name`: "Test Team Alpha"
   - `createdBy`: [premium user UID]
   - `members`: [premium user UID]
   - `createdAt`: timestamp

3. Check `users` collection → premium user document
4. **Expected**: `teamId` field contains the team code

#### Step 5: Team Status Display
1. **Expected**: Page should show "Current Team: Test Team Alpha"
2. **Expected**: Team code displayed
3. **Expected**: "Team Dashboard" and "Leave Team" buttons visible

### Scenario 2: Premium User - Join Team Flow

#### Step 1: Login as Second Premium User
1. Logout from first user
2. Login with second premium user
3. Navigate to Team page

#### Step 2: Join Existing Team
1. Enter team code from Scenario 1 (e.g., "ABC12345")
2. Click "Join Team"
3. **Expected**: Success message "Successfully Joined Team!"

#### Step 3: Verify Team Membership
1. Check Firebase Console → `teams` collection
2. **Expected**: Team document `members` array contains both user UIDs
3. Check second user document
4. **Expected**: `teamId` field contains the team code

### Scenario 3: Team Task Assignment

#### Step 1: Create Team Task
1. Navigate to `http://localhost:5500/task.html`
2. Login as premium user in team
3. **Expected**: Team Assignment section visible below task form

#### Step 2: Fill Task Form
1. Enter task title: "Team Test Task"
2. Enter description: "This is a test team task"
3. Set due date: Tomorrow
4. Select team member from dropdown
5. Click "Create Task"

#### Step 3: Verify Team Task Creation
1. Check Firebase Console → `tasks` → [teamId] → `teamTasks`
2. **Expected**: New task document with:
   - `title`: "Team Test Task"
   - `assignedTo`: [selected member UID]
   - `teamId`: [team code]
   - `createdBy`: [current user UID]

#### Step 4: Test Personal Task Fallback
1. Create another task without selecting team member
2. **Expected**: Task saved as personal task (not in team collection)

### Scenario 4: Team Dashboard Analytics

#### Step 1: Access Team Dashboard
1. Navigate to `http://localhost:5500/team-dashboard.html`
2. Login as team member
3. **Expected**: Dashboard loads with team statistics

#### Step 2: Verify Statistics
1. **Expected**: Total Tasks: 1 (from Scenario 3)
2. **Expected**: Completed Tasks: 0
3. **Expected**: Pending Tasks: 1
4. **Expected**: Team Members: 2

#### Step 3: Check Charts
1. **Member Performance Chart**:
   - Should show bar chart with team members
   - Assigned member should have 1 pending task
   - Other members should have 0 tasks

2. **Task Status Distribution**:
   - Should show pie chart
   - 1 pending task (100%)

#### Step 4: Verify Team Members List
1. **Expected**: Shows both team members
2. **Expected**: Each member card shows task counts
3. **Expected**: Member avatars with initials

#### Step 5: Check Recent Tasks Table
1. **Expected**: Shows "Team Test Task"
2. **Expected**: Shows assigned member name
3. **Expected**: Shows "pending" status
4. **Expected**: Shows due date

### Scenario 5: Real-time Updates

#### Step 1: Open Multiple Tabs
1. Open team dashboard in Tab 1
2. Open task page in Tab 2
3. Both logged in as different team members

#### Step 2: Create Task in Tab 2
1. Create new team task
2. Assign to different team member
3. Submit task

#### Step 3: Verify Real-time Update
1. Switch to Tab 1 (dashboard)
2. **Expected**: Statistics update automatically
3. **Expected**: Charts refresh
4. **Expected**: Recent tasks table updates
5. **Expected**: No page refresh needed

### Scenario 6: Free User Access Control

#### Step 1: Login as Free User
1. Login with free user account
2. Navigate to `http://localhost:5500/team.html`

#### Step 2: Verify Premium Gate
1. **Expected**: "Premium Required" message displayed
2. **Expected**: "Upgrade to Premium" link visible
3. **Not Expected**: Team creation/joining forms

#### Step 3: Test Team Dashboard Access
1. Navigate to `http://localhost:5500/team-dashboard.html`
2. **Expected**: "Premium Required" message
3. **Not Expected**: Dashboard content

#### Step 4: Test Task Page
1. Navigate to `http://localhost:5500/task.html`
2. **Expected**: Team assignment section hidden
3. **Expected**: Personal task creation works normally

### Scenario 7: Team Management

#### Step 1: Leave Team
1. Login as team member
2. Navigate to team page
3. Click "Leave Team"
4. Confirm action

#### Step 2: Verify Team Removal
1. Check Firebase Console → `teams` collection
2. **Expected**: User UID removed from `members` array
3. Check user document
4. **Expected**: `teamId` field is null/removed

#### Step 3: Re-join Team
1. Enter team code again
2. Click "Join Team"
3. **Expected**: Successfully re-joined

## 🔍 Debugging Tips

### Console Logs to Monitor
```javascript
// Team creation
[Team] Team created successfully: ABC12345

// Team joining
[Team] Successfully joined team: ABC12345

// Task creation
[Team Tasks] Team task created: [taskId]

// Dashboard updates
[Team Dashboard] Tasks updated, refreshing...
```

### Firebase Console Checks
1. **Authentication**: Verify user login status
2. **Firestore**: Check data creation/updates
3. **Security Rules**: Monitor permission errors

### Common Issues & Solutions

#### Issue: Team assignment section not showing
**Solution**: Check user role is "premium" and user has teamId

#### Issue: Dashboard not loading
**Solution**: Verify user is in team and has premium role

#### Issue: Real-time updates not working
**Solution**: Check Firestore security rules and network connectivity

#### Issue: Charts not rendering
**Solution**: Verify Chart.js is loaded and data is available

## 📊 Test Data Validation

### Expected Database State After Testing

#### Teams Collection
```javascript
{
  "ABC12345": {
    "name": "Test Team Alpha",
    "createdBy": "[premium1_uid]",
    "members": ["[premium1_uid]", "[premium2_uid]"],
    "createdAt": "[timestamp]"
  }
}
```

#### Users Collection
```javascript
{
  "[premium1_uid]": {
    "name": "Premium User 1",
    "email": "premium1@test.com",
    "role": "premium",
    "teamId": "ABC12345"
  },
  "[premium2_uid]": {
    "name": "Premium User 2", 
    "email": "premium2@test.com",
    "role": "premium",
    "teamId": "ABC12345"
  }
}
```

#### Team Tasks Collection
```javascript
{
  "ABC12345": {
    "teamTasks": {
      "[task1_id]": {
        "title": "Team Test Task",
        "description": "This is a test team task",
        "assignedTo": "[premium2_uid]",
        "teamId": "ABC12345",
        "status": "pending",
        "createdBy": "[premium1_uid]",
        "createdAt": "[timestamp]"
      }
    }
  }
}
```

## ✅ Test Checklist

### Core Functionality
- [ ] Premium user can create team
- [ ] Premium user can join team
- [ ] Team code generation works
- [ ] Team assignment in task form
- [ ] Team task creation and storage
- [ ] Personal task fallback works
- [ ] Dashboard statistics display
- [ ] Charts render correctly
- [ ] Real-time updates work
- [ ] Team member list shows correctly

### Access Control
- [ ] Free users see premium upgrade prompts
- [ ] Team features hidden for free users
- [ ] Security rules prevent unauthorized access
- [ ] User role checking works consistently

### Data Integrity
- [ ] Team data stored correctly in Firestore
- [ ] User documents updated with teamId
- [ ] Team tasks stored in correct collection
- [ ] Personal tasks remain separate
- [ ] No data conflicts between personal/team tasks

### User Experience
- [ ] Clear success/error messages
- [ ] Intuitive navigation flow
- [ ] Responsive design on mobile
- [ ] Loading states and feedback
- [ ] Form validation works

## 🚀 Performance Testing

### Load Testing
1. Create team with 5+ members
2. Create 20+ team tasks
3. Verify dashboard performance
4. Check chart rendering speed

### Network Testing
1. Test with slow internet connection
2. Verify offline behavior
3. Check reconnection handling

## 📝 Test Report Template

After completing all scenarios, document:

1. **Test Date**: [Date]
2. **Test Environment**: [Browser/OS]
3. **Test Results**: Pass/Fail for each scenario
4. **Issues Found**: List any bugs or issues
5. **Performance Notes**: Any performance concerns
6. **Recommendations**: Suggestions for improvements

---

**Testing Status**: Ready for execution
**Estimated Time**: 30-45 minutes for complete testing
**Required Resources**: 2 premium accounts, 1 free account, Firebase access 