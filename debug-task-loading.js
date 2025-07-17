// Task Data Loading Diagnostic Script
// This script will help identify why task data is not loading properly

console.log('=== Task Data Loading Diagnostic ===');

// Check if Firebase is initialized
function checkFirebaseInitialization() {
    console.log('1. Checking Firebase initialization...');
    
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase is not loaded');
        return false;
    }
    
    if (!firebase.auth) {
        console.error('❌ Firebase Auth is not loaded');
        return false;
    }
    
    if (!firebase.firestore) {
        console.error('❌ Firebase Firestore is not loaded');
        return false;
    }
    
    console.log('✅ Firebase is properly initialized');
    return true;
}

// Check user authentication
async function checkUserAuthentication() {
    console.log('2. Checking user authentication...');
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('❌ No authenticated user found');
            return null;
        }
        
        console.log('✅ User authenticated:', user.email);
        return user;
    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        return null;
    }
}

// Check Firestore connection
async function checkFirestoreConnection() {
    console.log('3. Checking Firestore connection...');
    
    try {
        const db = firebase.firestore();
        const testDoc = await db.collection('test').doc('connection-test').get();
        console.log('✅ Firestore connection successful');
        return true;
    } catch (error) {
        console.error('❌ Firestore connection failed:', error);
        return false;
    }
}

// Check task data in Firestore
async function checkTaskData() {
    console.log('4. Checking task data in Firestore...');
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('❌ No user for task data check');
            return;
        }
        
        const db = firebase.firestore();
        
        // Check tasks collection
        const tasksSnapshot = await db.collection('tasks')
            .where('userId', '==', user.uid)
            .limit(5)
            .get();
        
        console.log(`📊 Found ${tasksSnapshot.size} tasks for user`);
        
        if (tasksSnapshot.empty) {
            console.warn('⚠️ No tasks found for user');
        } else {
            tasksSnapshot.forEach(doc => {
                console.log(`   - Task: ${doc.data().title || 'No title'} (${doc.id})`);
            });
        }
        
        // Check task history
        const historySnapshot = await db.collection('taskHistory')
            .where('userId', '==', user.uid)
            .limit(5)
            .get();
        
        console.log(`📊 Found ${historySnapshot.size} task history entries`);
        
        // Check recent activities
        const activitiesSnapshot = await db.collection('recentActivities')
            .where('userId', '==', user.uid)
            .limit(5)
            .get();
        
        console.log(`📊 Found ${activitiesSnapshot.size} recent activities`);
        
    } catch (error) {
        console.error('❌ Task data check failed:', error);
    }
}

// Check DOM elements for task sections
function checkDOMElements() {
    console.log('5. Checking DOM elements...');
    
    const elements = [
        'taskSummary',
        'recentActivities', 
        'taskHistory',
        'taskSummaryContainer',
        'recentActivitiesContainer',
        'taskHistoryContainer'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ Found element: ${id}`);
        } else {
            console.warn(`⚠️ Missing element: ${id}`);
        }
    });
}

// Check for common JavaScript errors
function checkJavaScriptErrors() {
    console.log('6. Checking for JavaScript errors...');
    
    // Check if task-related functions exist
    const functions = [
        'loadTaskSummary',
        'loadRecentActivities', 
        'loadTaskHistory',
        'updateTaskSummary',
        'displayRecentActivities',
        'displayTaskHistory'
    ];
    
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ Function exists: ${funcName}`);
        } else {
            console.warn(`⚠️ Missing function: ${funcName}`);
        }
    });
}

// Check console for errors
function checkConsoleErrors() {
    console.log('7. Checking console errors...');
    
    const originalError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
    };
    
    // Wait a bit and then report
    setTimeout(() => {
        if (errors.length > 0) {
            console.log(`⚠️ Found ${errors.length} console errors:`);
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('✅ No console errors detected');
        }
    }, 2000);
}

// Main diagnostic function
async function runDiagnostics() {
    console.log('Starting task data loading diagnostics...\n');
    
    // Run all checks
    checkFirebaseInitialization();
    await checkUserAuthentication();
    await checkFirestoreConnection();
    await checkTaskData();
    checkDOMElements();
    checkJavaScriptErrors();
    checkConsoleErrors();
    
    console.log('\n=== Diagnostic Complete ===');
    console.log('Check the console output above for issues.');
    console.log('Common fixes:');
    console.log('1. Ensure user is logged in');
    console.log('2. Check Firebase configuration');
    console.log('3. Verify task data exists in Firestore');
    console.log('4. Check for JavaScript errors in browser console');
}

// Auto-run diagnostics when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDiagnostics);
} else {
    runDiagnostics();
}

// Export for manual use
window.runTaskDiagnostics = runDiagnostics; 