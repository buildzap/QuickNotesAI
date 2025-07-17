// Debug log helper
const debugLog = (message) => {
    console.log(`[Login] ${message}`);
};

// Show loading state
function setLoading(isLoading) {
    const loginButton = document.getElementById('loginButton');
    const loginSpinner = document.getElementById('loginSpinner');
    if (!loginButton || !loginSpinner) return;

    const buttonText = loginButton.querySelector('span');
    if (isLoading) {
        buttonText.style.opacity = '0';
        loginSpinner.classList.remove('d-none');
        loginButton.disabled = true;
    } else {
        buttonText.style.opacity = '1';
        loginSpinner.classList.add('d-none');
        loginButton.disabled = false;
    }
}

// Helper to show error messages
function showError(message, type = 'login') {
    const errorDiv = document.getElementById(`${type}Error`);
    if (errorDiv) {
        // Create a more user-friendly error display with icon
        const icon = getErrorIcon(message);
        errorDiv.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="fas ${icon} me-2"></i>
                <div>${message}</div>
            </div>
        `;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Add shake animation for better user feedback
        errorDiv.classList.add('shake');
        setTimeout(() => {
            errorDiv.classList.remove('shake');
        }, 500);
    }
}

// Helper function to get appropriate icon based on error message
function getErrorIcon(message) {
    if (message.includes('network') || message.includes('connection')) {
        return 'fa-wifi';
    } else if (message.includes('password') || message.includes('credentials')) {
        return 'fa-lock';
    } else if (message.includes('email')) {
        return 'fa-envelope';
    } else if (message.includes('timeout')) {
        return 'fa-clock';
    } else if (message.includes('disabled')) {
        return 'fa-ban';
    } else if (message.includes('too many')) {
        return 'fa-exclamation-triangle';
    } else {
        return 'fa-exclamation-circle';
    }
}

// Helper to clear error messages
function clearError(type = 'login') {
    const errorDiv = document.getElementById(`${type}Error`);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Helper to show success messages
function showSuccess(message, type = 'login') {
    const errorDiv = document.getElementById(`${type}Error`);
    if (errorDiv) {
        errorDiv.innerHTML = `
            <div class="alert alert-success d-flex align-items-center" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <div>${message}</div>
            </div>
        `;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize login page
async function initializeLoginPage() {
    try {
        debugLog('Initializing login page...');
        await window.firebaseInitialized;
        
        if (!window.firebaseAuth) {
            throw new Error('Firebase Auth not initialized');
        }

        // Check if already logged in
        const currentUser = window.firebaseAuth.currentUser;
        if (currentUser) {
            debugLog('User already logged in, redirecting to task page...');
            window.location.href = 'task.html';
            return;
        }

        debugLog('Login page initialized successfully');
        return true;
    } catch (error) {
        console.error('[Login] Initialization error:', error);
        showError('Error initializing application. Please refresh the page.', 'login');
        return false;
    }
}

// Handle login form submission
async function handleLogin(email, password) {
    try {
        setLoading(true);
        clearError('login');

        const isInitialized = await initializeLoginPage();
        if (!isInitialized) {
            throw new Error('Login page not properly initialized');
        }

        await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        debugLog('Login successful');
        // Navigation is handled by auth state change in firebase.js
        // Direct navigation to task page for immediate feedback
        window.location.href = 'task.html';
    } catch (error) {
        console.error('[Login] Login error:', error);
        let errorMessage = 'An error occurred during login. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-login-credentials':
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password login is not enabled. Please contact support.';
                break;
            default:
                // For unknown errors, provide a generic but helpful message
                if (error.message && error.message.includes('network')) {
                    errorMessage = 'Network error. Please check your internet connection and try again.';
                } else if (error.message && error.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                } else {
                    errorMessage = 'Login failed. Please check your credentials and try again.';
                }
                break;
        }
        
        showError(errorMessage, 'login');
    } finally {
        setLoading(false);
    }
}

// Handle signup form submission
async function handleSignup(email, password) {
    try {
        setLoading(true);
        clearError('signup');

        const isInitialized = await initializeLoginPage();
        if (!isInitialized) {
            throw new Error('Login page not properly initialized');
        }

        // Create user with email and password
        const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
        debugLog('Signup successful');
        
        // Create user document in Firestore
        if (window.firebaseDb && userCredential.user) {
            try {
                await window.firebaseDb.collection('users').doc(userCredential.user.uid).set({
                    email: userCredential.user.email,
                    role: 'free',
                    createdAt: new Date(),
                    lastLogin: new Date()
                });
                debugLog('User document created in Firestore');
            } catch (firestoreError) {
                console.warn('[Login] Error creating user document:', firestoreError);
                // Don't fail signup if Firestore fails
            }
        }
        
        // Navigation is handled by auth state change in firebase.js
        // Direct navigation to task page for immediate feedback
        window.location.href = 'task.html';
    } catch (error) {
        console.error('[Login] Signup error:', error);
        let errorMessage = 'An error occurred during signup. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists. Please sign in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            default:
                // For unknown errors, provide a generic but helpful message
                if (error.message && error.message.includes('network')) {
                    errorMessage = 'Network error. Please check your internet connection and try again.';
                } else if (error.message && error.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                } else {
                    errorMessage = 'Signup failed. Please check your information and try again.';
                }
                break;
        }
        
        showError(errorMessage, 'signup');
    } finally {
        setLoading(false);
    }
}

// Toggle between login and signup forms
function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm && signupForm) {
        if (loginForm.classList.contains('d-none')) {
            // Show login form
            loginForm.classList.remove('d-none');
            signupForm.classList.add('d-none');
            clearError('login');
        } else {
            // Show signup form
            signupForm.classList.remove('d-none');
            loginForm.classList.add('d-none');
            clearError('signup');
        }
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email')?.value?.trim();
            const password = document.getElementById('password')?.value;
            
            if (!email || !password) {
                showError('Please enter both email and password', 'login');
                return;
            }
            
            await handleLogin(email, password);
        });
    }

    // Signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail')?.value?.trim();
            const password = document.getElementById('signupPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            if (!email || !password || !confirmPassword) {
                showError('Please fill in all fields', 'signup');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match', 'signup');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long', 'signup');
                return;
            }
            
            await handleSignup(email, password);
        });
    }

    // Form toggle handlers
    const toggleLinks = document.querySelectorAll('.toggle-form');
    toggleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            toggleForm();
        });
    });

    // Google sign-in handler
    const googleSignInButton = document.getElementById('googleSignIn');
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', async () => {
            try {
                setLoading(true);
                clearError('login');
                clearError('signup');
                
                const provider = new firebase.auth.GoogleAuthProvider();
                await window.firebaseAuth.signInWithPopup(provider);
                debugLog('Google sign-in successful');
                
                // Navigation is handled by auth state change in firebase.js
            } catch (error) {
                console.error('[Login] Google sign-in error:', error);
                showError('An error occurred during Google sign-in. Please try again.', 'login');
            } finally {
                setLoading(false);
            }
        });
    }
}

// Initialize the login page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        debugLog('Starting login page initialization...');
        // Show loading state
        setLoading(true);
        
        // Initialize the login page
        const isInitialized = await initializeLoginPage();
        if (!isInitialized) {
            throw new Error('Failed to initialize login page');
        }
        
        // Initialize event listeners
        initializeEventListeners();
        
        // Hide loading state
        setLoading(false);
        debugLog('Login page ready');
    } catch (error) {
        console.error('[Login] Startup error:', error);
        showError('Error initializing application. Please refresh the page.', 'login');
        setLoading(false);
    }
});
