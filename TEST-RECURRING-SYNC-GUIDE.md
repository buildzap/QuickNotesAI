# Testing Recurring Task Sync Functionality

## Prerequisites
1. Server is running on `http://localhost:5500`
2. You have a Google account
3. You're logged in to the application

## Step-by-Step Testing Guide

### Step 1: Access the Application
1. Open your browser and go to `http://localhost:5500`
2. Log in to the application
3. Navigate to the Tasks page (`http://localhost:5500/task.html`)

### Step 2: Create a Recurring Task
1. **Fill in the task form:**
   - **Title**: "Daily Standup"
   - **Description**: "Daily team standup meeting"
   - **Due Date**: Set to any future date (this will be ignored for calendar events)
   - **Priority**: High
   - **Status**: In Progress
   - **Input Method**: Manual

2. **Enable Recurring Options:**
   - Check the "Make this task recurring" checkbox
   - **Frequency**: Select "Daily"
   - **Repeat Time**: Set to "09:00"
   - Verify the "Next occurrence" shows the correct time

3. **Create the Task:**
   - Click "Add Task"
   - You should see a success message: "Recurring task created! Use the sync button to add to Google Calendar."

### Step 3: Connect to Google Calendar
1. **Scroll down to the Calendar Integration section**
2. **Click "Connect to Google Calendar"**
3. **Sign in with your Google account**
4. **Grant calendar permissions**
5. **Verify the status shows "Connected"**

### Step 4: Sync the Recurring Task
1. **Find your recurring task in the task list**
2. **Look for the recurring indicator** (🔄 icon next to the task title)
3. **Click the three dots menu** (⋮) on the task
4. **Click "Sync to Google Calendar"**
5. **A modal should appear** asking for sync duration
6. **Select "1 Month"** and click "Sync to Calendar"

### Step 5: Verify the Results
1. **Check your Google Calendar** for the new recurring event
2. **Verify the event details:**
   - **Title**: "Daily Standup 🔄"
   - **Time**: 09:00 (not the due date time)
   - **Recurrence**: Daily for 1 month
   - **Description**: Should include task details and "Sync Duration: 1 Month"

## Expected Behavior

### For Daily Recurring Task:
- **Task**: "Daily Standup" recurring daily at 09:00
- **User selects**: 1 month sync
- **Result**: Calendar events every day at 09:00 for 1 month

### For Weekly Recurring Task:
- **Task**: "Weekly Review" recurring weekly at 14:00
- **User selects**: 1 week sync
- **Result**: Calendar events every week at 14:00 for 1 week

## Troubleshooting

### If the sync button doesn't appear:
1. **Check user role**: Make sure you're logged in as a premium user
2. **Check task type**: Ensure the task is marked as recurring
3. **Refresh the page**: Sometimes the UI needs a refresh

### If the modal doesn't appear:
1. **Check browser console** for JavaScript errors
2. **Verify Bootstrap is loaded** (modal functionality)
3. **Check if the modal HTML is present** in the page source

### If Google Calendar sync fails:
1. **Verify Google Calendar connection** is active
2. **Check Google Calendar API permissions**
3. **Look for error messages** in the browser console

## Debug Information

The implementation includes extensive logging. Check the browser console for:
- `[Task]` - Task-related operations
- `[gcal]` - Google Calendar operations
- `[Recurring]` - Recurring task operations

## Test Page

You can also test the modal functionality independently at:
`http://localhost:5500/test-sync-modal.html`

This page simulates the sync process without requiring actual Google Calendar connection. 