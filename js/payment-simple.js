// Use window.currentUser instead of local variable

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_joQDkSFqA4rIId';
const PREMIUM_AMOUNT = 49900; // ₹499 in paise

// DOM Elements
const subscribeBtn = document.getElementById('subscribeBtn');
const signOutBtn = document.getElementById('signOut');

// Disable subscribe button until auth state is known
if (subscribeBtn) subscribeBtn.disabled = true;
let authResolved = false;

// Ensure currentUser is set from Firebase Auth on page load
function handleAuthStateForPayment(user) {
                window.currentUser = user;
    authResolved = true;
    if (subscribeBtn) {
        if (!user) {
            subscribeBtn.disabled = true;
            subscribeBtn.textContent = 'Subscribe Now';
        } else {
            // Always enable button for authenticated users
            window.firebaseDb.collection('users').doc(user.uid).onSnapshot(doc => {
                if (doc.exists && doc.data()?.role === 'premium') {
                    subscribeBtn.disabled = true;
                    subscribeBtn.textContent = 'Already Premium';
                } else {
                    subscribeBtn.disabled = false;
                    subscribeBtn.textContent = 'Subscribe Now';
                }
            });
        }
    }
}

if (window.firebaseAuth) {
    window.firebaseAuth.onAuthStateChanged(handleAuthStateForPayment);
} else if (window.firebase && window.firebase.auth) {
    window.firebase.auth().onAuthStateChanged(handleAuthStateForPayment);
}

// Subscribe Button Click - SIMPLIFIED VERSION
subscribeBtn.addEventListener('click', async () => {
    if (!authResolved) {
        alert('Checking authentication, please wait...');
        return;
    }
    if (!currentUser) {
        alert('Please sign in to upgrade.');
        return;
    }

    // Log test mode info to console only (no popups)
    if (RAZORPAY_KEY_ID.includes('test')) {
        console.log('🧪 TEST MODE - Use test card: 4111 1111 1111 1111');
    }

    // SIMPLIFIED Razorpay options - minimal configuration
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: PREMIUM_AMOUNT,
        currency: "INR",
        name: "QuickNotes AI",
        description: "Premium Subscription",
        prefill: {
            email: window.currentUser.email
        },
        handler: async function (response) {
            try {
                console.log('Payment successful:', response);
                // Update Firestore user role to premium
                await window.firebaseDb.collection('users').doc(window.currentUser.uid).set({
                    role: 'premium',
                    premiumSince: new Date(),
                    paymentId: response.razorpay_payment_id
                }, { merge: true });
                alert('Welcome to Premium! Your account has been upgraded.');
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Error updating user to premium:', error);
                alert('Payment successful but there was an error updating your account. Please contact support.');
            }
        },
        modal: {
            ondismiss: function() {
                console.log('Payment modal closed');
            }
        },
        theme: {
            color: "#6366f1"
        }
    };

    console.log('Razorpay options:', options);

    try {
        const rzp = new Razorpay(options);
        
        // Simple error handling
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error);
            alert('Payment failed: ' + response.error.description);
        });

        rzp.on('payment.cancelled', function (response) {
            console.log('Payment cancelled:', response);
        });
        
        rzp.open();
    } catch (error) {
        console.error('Error creating Razorpay instance:', error);
        alert('Error initializing payment. Please try again or contact support.');
    }
});

// Sign Out
signOutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}); 