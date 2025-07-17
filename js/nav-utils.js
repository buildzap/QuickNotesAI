// nav-utils.js - Navigation utilities for team features

// Use existing variables from window object

// Global signout function
window.signOut = async function() {
    try {
        console.log('[Nav Utils] Signing out user...');
        
        // Get Firebase auth instance
        const auth = window.firebaseAuth || (window.firebase && window.firebase.auth);
        
        if (auth) {
            await auth.signOut();
            console.log('[Nav Utils] User signed out successfully');
        } else {
            console.warn('[Nav Utils] Firebase auth not available');
        }
        
        // Clear local storage
        localStorage.removeItem('quicknotes_tasks');
        localStorage.removeItem('premium_user');
        sessionStorage.removeItem('premium_user');
        
        // Clear any global state
        if (window.taskState) {
            window.taskState.tasks = [];
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('[Nav Utils] Sign out error:', error);
        
        // Show error message if available
        if (window.showToast) {
            window.showToast('Error signing out. Please try again.', 'danger');
        } else {
            alert('Error signing out. Please try again.');
        }
    }
};

// Alternative function names for compatibility
window.logout = window.signOut;
window.signOutUser = window.signOut;

// Setup signout buttons across all pages
function setupSignOutButtons() {
    console.log('[Nav Utils] Setting up signout buttons...');
    
    // Find all signout buttons
    const signOutButtons = document.querySelectorAll('#signOutBtn, #signOut, button[onclick*="signOut"], button[onclick*="logout"]');
    
    signOutButtons.forEach(button => {
        console.log('[Nav Utils] Setting up signout button:', button.id || button.className);
        
        // Remove any existing onclick handlers
        button.removeAttribute('onclick');
        
        // Add click event listener
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.signOut();
        });
    });
    
    console.log('[Nav Utils] Signout buttons setup complete');
    
    // Set up a MutationObserver to handle dynamically added signout buttons
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // Check if the added node is a signout button
                    if (node.matches && (node.matches('#signOutBtn, #signOut') || 
                        node.getAttribute && (node.getAttribute('onclick') && 
                        (node.getAttribute('onclick').includes('signOut') || node.getAttribute('onclick').includes('logout'))))) {
                        console.log('[Nav Utils] Found dynamically added signout button:', node.id || node.className);
                        setupSignOutButton(node);
                    }
                    
                    // Check children of added node
                    const signOutButtons = node.querySelectorAll && node.querySelectorAll('#signOutBtn, #signOut, button[onclick*="signOut"], button[onclick*="logout"]');
                    if (signOutButtons) {
                        signOutButtons.forEach(setupSignOutButton);
                    }
                }
            });
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Helper function to setup a single signout button
function setupSignOutButton(button) {
    // Remove any existing onclick handlers
    button.removeAttribute('onclick');
    
    // Remove any existing click listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add click event listener
    newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.signOut();
    });
    
    console.log('[Nav Utils] Signout button setup complete:', newButton.id || newButton.className);
}

// Initialize navigation utilities
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Nav Utils] Initializing navigation utilities...');
    
    // Setup signout buttons
    setupSignOutButtons();
    
    // Hide team navigation by default for all users
    hideTeamNavigation();
    
    // Check authentication and update navigation
    checkAuthAndUpdateNav();
    
    // Add fallback check for premium users
    setTimeout(checkPremiumStatusFallback, 2000);
    
    // Add another fallback check after 5 seconds
    setTimeout(checkPremiumStatusFallback, 5000);
});

// Fallback function to check premium status
function checkPremiumStatusFallback() {
    console.log('[Nav Utils] Running fallback premium check...');
    
    // Check if user is premium based on multiple indicators
    const isPremium = checkPremiumIndicators();
    
    if (isPremium) {
        console.log('[Nav Utils] Premium user detected via fallback, showing team navigation');
        showTeamNavigation();
    } else {
        console.log('[Nav Utils] Free user detected via fallback, hiding team navigation');
        hideTeamNavigation();
    }
}

// Check multiple indicators of premium status
function checkPremiumIndicators() {
    // Check if user has premium class on body
    if (document.body.classList.contains('premium-user')) {
        return true;
    }
    
    // Check if window has premium indicators
    if (window.userRole === 'premium' || window.isPremiumUser === true) {
        return true;
    }
    
    // Check if user email is in premium list
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        const premiumEmails = [
            'premium1@test.com',
            'premium2@test.com',
            'admin@quicknotes.ai',
            'premium@quicknotes.ai',
            'chandrumcspeaks@gmail.com' // Add your email here
        ];
        
        if (premiumEmails.includes(window.firebaseAuth.currentUser.email.toLowerCase())) {
            return true;
        }
    }
    
    // Check if premium banner is visible
    const premiumBanner = document.getElementById('premiumBanner');
    if (premiumBanner && premiumBanner.style.display !== 'none') {
        return true;
    }
    
    return false;
}

// Check authentication and update navigation
async function checkAuthAndUpdateNav() {
    try {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                window.currentUser = user;
                console.log('[Nav Utils] User authenticated:', user.email);
                await loadUserDataAndUpdateNav();
            } else {
                console.log('[Nav Utils] No user authenticated');
                hideTeamNavigation();
            }
        });
    } catch (error) {
        console.error('[Nav Utils] Error checking auth:', error);
        hideTeamNavigation();
    }
}

// Load user data and update navigation
async function loadUserDataAndUpdateNav() {
    try {
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(window.currentUser.uid)
            .get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            window.userRole = userData.role || 'free';
            
            console.log('[Nav Utils] User role:', window.userRole);
            
            if (window.userRole === 'premium') {
                console.log('[Nav Utils] Premium user detected, showing team navigation');
                showTeamNavigation();
            } else {
                console.log('[Nav Utils] Free user detected, hiding team navigation');
                hideTeamNavigation();
            }
        } else {
            console.log('[Nav Utils] User document not found, hiding team navigation');
            hideTeamNavigation();
        }
    } catch (error) {
        console.error('[Nav Utils] Error loading user data:', error);
        hideTeamNavigation();
    }
}

// Show team navigation for premium users
function showTeamNavigation() {
    console.log('[Nav Utils] Showing team navigation for premium user...');
    
    // Show all team navigation items
    const teamNavItems = document.querySelectorAll('#teamNavItem, .team-nav-item, [data-team-nav]');
    teamNavItems.forEach(item => {
        item.style.display = 'block';
        console.log('[Nav Utils] Team nav item shown:', item.id || item.className);
    });
    
    // Show team dashboard navigation items
    const teamDashboardNavItems = document.querySelectorAll('#teamDashboardNavItem, .team-dashboard-nav-item, [data-team-dashboard-nav]');
    teamDashboardNavItems.forEach(item => {
        item.style.display = 'block';
        console.log('[Nav Utils] Team dashboard nav item shown:', item.id || item.className);
    });
    
    // Show team dashboard buttons
    const teamDashboardBtns = document.querySelectorAll('#teamDashboardBtn, .team-dashboard-btn');
    teamDashboardBtns.forEach(btn => {
        btn.style.display = 'block';
        console.log('[Nav Utils] Team dashboard button shown:', btn.id || btn.className);
    });
    
    // Show footer team links
    const footerTeamLinks = document.querySelectorAll('#footerTeamLink, .footer-team-link');
    footerTeamLinks.forEach(link => {
        link.style.display = 'block';
        console.log('[Nav Utils] Footer team link shown:', link.id || link.className);
    });
    
    const footerTeamDashboardLinks = document.querySelectorAll('#footerTeamDashboardLink, .footer-team-dashboard-link');
    footerTeamDashboardLinks.forEach(link => {
        link.style.display = 'block';
        console.log('[Nav Utils] Footer team dashboard link shown:', link.id || link.className);
    });
    
    console.log('[Nav Utils] Team navigation shown successfully');
}

// Hide team navigation for free users
function hideTeamNavigation() {
    console.log('[Nav Utils] Hiding team navigation for free user...');
    
    // Hide all team navigation items
    const teamNavItems = document.querySelectorAll('#teamNavItem, .team-nav-item, [data-team-nav]');
    teamNavItems.forEach(item => {
        item.style.display = 'none';
        console.log('[Nav Utils] Team nav item hidden:', item.id || item.className);
    });
    
    // Hide team dashboard navigation items
    const teamDashboardNavItems = document.querySelectorAll('#teamDashboardNavItem, .team-dashboard-nav-item, [data-team-dashboard-nav]');
    teamDashboardNavItems.forEach(item => {
        item.style.display = 'none';
        console.log('[Nav Utils] Team dashboard nav item hidden:', item.id || item.className);
    });
    
    // Hide team dashboard buttons
    const teamDashboardBtns = document.querySelectorAll('#teamDashboardBtn, .team-dashboard-btn');
    teamDashboardBtns.forEach(btn => {
        btn.style.display = 'none';
        console.log('[Nav Utils] Team dashboard button hidden:', btn.id || btn.className);
    });
    
    // Hide footer team links
    const footerTeamLinks = document.querySelectorAll('#footerTeamLink, .footer-team-link');
    footerTeamLinks.forEach(link => {
        link.style.display = 'none';
        console.log('[Nav Utils] Footer team link hidden:', link.id || link.className);
    });
    
    const footerTeamDashboardLinks = document.querySelectorAll('#footerTeamDashboardLink, .footer-team-dashboard-link');
    footerTeamDashboardLinks.forEach(link => {
        link.style.display = 'none';
        console.log('[Nav Utils] Footer team dashboard link hidden:', link.id || link.className);
    });
    
    console.log('[Nav Utils] Team navigation hidden successfully');
}

// Update user info in navbar (if userInfo element exists)
function updateUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && window.currentUser) {
        const displayName = window.currentUser.displayName || window.currentUser.email.split('@')[0];
        userInfoElement.innerHTML = `
            <i class="bi bi-person-circle me-1"></i>
            ${displayName}
            ${window.userRole === 'premium' ? '<span class="badge bg-warning text-dark ms-1">Premium</span>' : ''}
        `;
    }
}

// Export functions for use in other files
window.navUtils = {
    currentUser: window.currentUser,
    userRole: window.userRole,
    showTeamNavigation,
    hideTeamNavigation,
    updateUserInfo
};

// Add global functions for manual testing
window.showTeamNav = function() {
    console.log('[Manual] Showing team navigation...');
    showTeamNavigation();
};

window.hideTeamNav = function() {
    console.log('[Manual] Hiding team navigation...');
    hideTeamNavigation();
};

window.checkPremiumStatus = function() {
    console.log('[Manual] Checking premium status...');
    const isPremium = checkPremiumIndicators();
    console.log('[Manual] Premium status:', isPremium);
    return isPremium;
};

// Log available functions
console.log('[Nav Utils] Available manual functions:');
console.log('- window.showTeamNav() - Force show team navigation');
console.log('- window.hideTeamNav() - Force hide team navigation');
console.log('- window.checkPremiumStatus() - Check premium status'); 