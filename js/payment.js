let currentUser = null;

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_iMpWBHsu8rep8d';  // Replace with your key
const PREMIUM_AMOUNT = 49900;  // ₹499 in paise

// DOM Elements
const subscribeBtn = document.getElementById('subscribeBtn');
const signOutBtn = document.getElementById('signOut');

// Disable subscribe button until auth state is known
if (subscribeBtn) subscribeBtn.disabled = true;
let authResolved = false;

// Initialize Lottie Animation
document.addEventListener('DOMContentLoaded', () => {
    const upgradeAnimation = document.getElementById('upgradeAnimation');
    if (upgradeAnimation) {
        upgradeAnimation.innerHTML = `
            <lottie-player
                src="https://assets2.lottiefiles.com/packages/lf20_3j8ixkkl.json"
                background="transparent"
                speed="1"
                style="width: 300px; height: 300px; margin: 0 auto;"
                loop
                autoplay>
            </lottie-player>
        `;
    }
});

// Ensure currentUser is set from Firebase Auth on page load
function handleAuthStateForPayment(user) {
    currentUser = user;
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

// Subscribe Button Click
subscribeBtn.addEventListener('click', async () => {
    if (!authResolved) {
        alert('Checking authentication, please wait...');
        return;
    }
    if (!currentUser) {
        alert('Please sign in to upgrade.');
        return;
    }

    // Razorpay options (no order_id in test mode)
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: PREMIUM_AMOUNT,
        currency: "INR",
        name: "QuickNotes AI",
        description: "Premium Subscription",
        prefill: {
            email: currentUser.email,
            contact: "" // Optional
        },
        handler: async function (response) {
            // Directly update Firestore user role to premium
            await window.firebaseDb.collection('users').doc(currentUser.uid).set({
                role: 'premium',
                premiumSince: new Date()
            }, { merge: true });
            alert('Welcome to Premium! Your account has been upgraded.');
            window.location.href = 'dashboard.html';
        },
        modal: {
            ondismiss: handlePaymentDismiss
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
});

// Payment Dismiss Handler
function handlePaymentDismiss() {
    console.log('Payment modal closed');
}

// Sign Out
signOutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});
