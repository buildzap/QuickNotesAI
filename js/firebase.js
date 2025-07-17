/**
 * Firebase services initialization and management
 */

// Flag to track navigation state
window.isNavigating = false;

// Safe navigation helper
function safeNavigate(path) {
    if (window.isNavigating) return;
    window.isNavigating = true;

    try {
        const currentPath = window.location.pathname.toLowerCase();
        const targetPath = (path.startsWith('/') ? path : `/${path}`).toLowerCase();
        
        // Don't navigate if we're already on the target page
        if (!currentPath.endsWith(targetPath)) {
            console.log(`[Firebase] Navigating from ${currentPath} to ${targetPath}`);
            window.location.href = path;
        } else {
            console.log(`[Firebase] Already on ${targetPath}, skipping navigation`);
        }
    } catch (error) {
        console.error('[Firebase] Navigation error:', error);
    } finally {
        // Reset navigation flag after a delay
        setTimeout(() => {
            window.isNavigating = false;
        }, 1000);
    }
}

// Handle page access based on auth state
function handleAuthState(user) {
    // Normalize current path for comparison
    const currentPath = window.location.pathname.toLowerCase();
    const isLoginPage = currentPath.includes('login.html');
    const isIndexPage = currentPath.endsWith('/') || currentPath.endsWith('index.html');
    const isTaskPage = currentPath.includes('task.html');
    
    if (user) {
        // User is signed in
        console.log('[Firebase] User is signed in:', user.email);
        // Ensure user document exists and set role to 'free' if missing
        if (window.firebaseDb) {
            const userRef = window.firebaseDb.collection('users').doc(user.uid);
            userRef.get().then(doc => {
                if (!doc.exists) {
                    userRef.set({
                        email: user.email,
                        role: 'free',
                        createdAt: new Date()
                    }, { merge: true });
                } else if (!doc.data().role) {
                    userRef.set({ role: 'free' }, { merge: true });
                }
            });
        }
        
        // Update UI elements
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        
        // Update user name display
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            // Extract name from email (everything before @)
            const name = user.email.split('@')[0];
            // Capitalize first letter
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            userNameElement.textContent = `👋 Welcome, ${displayName}`;
        }
        
        // Redirect to task page if on login or index
        if (isLoginPage || isIndexPage) {
            // Small delay to ensure UI is ready
            setTimeout(() => safeNavigate('task.html'), 100);
        }
    } else {
        // User is signed out
        console.log('[Firebase] User is signed out');
        
        // If on any page except login/index, redirect to login
        if (!isLoginPage && !isIndexPage) {
            // Small delay to ensure UI is ready
            setTimeout(() => safeNavigate('login.html'), 100);
        }
    }
}

// Initialize everything in the right order
(async function initialize() {
    try {
        // Wait for Firebase core to be ready
        await window.firebaseInitialized;
        
        if (!window.firebaseAuth) {
            throw new Error('Firebase Auth not initialized');
        }

        // Set up auth state handler
        window.firebaseAuth.onAuthStateChanged(handleAuthState);
        
        console.log('[Firebase] Services initialization complete');
    } catch (error) {
        console.error('[Firebase] Service initialization error:', error);
    }
})();
