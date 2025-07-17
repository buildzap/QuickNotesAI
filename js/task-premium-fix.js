// Premium User Detection and Feature Unlocking Fix
// This script ensures that premium users get all premium features unlocked and visible

class PremiumFeatureManager {
    constructor() {
        this.premiumEmails = [
            'premium1@test.com',
            'premium2@test.com',
            'admin@quicknotes.ai',
            'premium@quicknotes.ai'
        ];
        this.isPremium = false;
        this.userRole = 'free';
        this.init();
    }

    async init() {
        console.log('[Premium] Initializing Premium Feature Manager...');
        
        // Wait for Firebase to be ready
        if (window.firebaseAuth) {
            this.setupAuthListener();
        } else {
            // If Firebase not ready, check periodically
            const checkInterval = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkInterval);
                    this.setupAuthListener();
                }
            }, 1000);
        }

        // Also check on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.checkAndUnlockFeatures();
            });
        } else {
            this.checkAndUnlockFeatures();
        }
    }

    setupAuthListener() {
        console.log('[Premium] Setting up auth listener...');
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('[Premium] User authenticated:', user.email);
                await this.checkPremiumStatus(user);
            } else {
                console.log('[Premium] No user authenticated');
                this.setFreeUser();
            }
        });
    }

    async checkPremiumStatus(user) {
        try {
            console.log('[Premium] Checking premium status for:', user.email);
            
            // First check if it's a known premium email
            if (this.premiumEmails.includes(user.email.toLowerCase())) {
                console.log('[Premium] Known premium email detected');
                this.setPremiumUser();
                return;
            }

            // Check Firebase for user role
            if (window.firebaseDb) {
                try {
                    const userDoc = await window.firebaseDb
                        .collection('users')
                        .doc(user.uid)
                        .get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const role = userData.role || userData.premium ? 'premium' : 'free';
                        
                        if (role === 'premium') {
                            console.log('[Premium] Premium role found in Firebase');
                            this.setPremiumUser();
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('[Premium] Error checking Firebase:', error);
                }
            }

            // If we get here, user is not premium
            this.setFreeUser();
            
        } catch (error) {
            console.error('[Premium] Error checking premium status:', error);
            this.setFreeUser();
        }
    }

    setPremiumUser() {
        console.log('[Premium] Setting user as PREMIUM');
        this.isPremium = true;
        this.userRole = 'premium';
        window.userRole = 'premium';
        window.isPremiumUser = true;
        
        // Add premium class to body
        document.body.classList.add('premium-user');
        document.body.classList.remove('free-user');
        
        // Unlock all premium features
        this.unlockAllPremiumFeatures();
        
        // Show premium banner
        this.showPremiumBanner();
        
        // Force update recurring UI
        if (window.recurringTaskManager) {
            window.recurringTaskManager.updateRecurringUI();
        }
    }

    setFreeUser() {
        console.log('[Premium] Setting user as FREE');
        this.isPremium = false;
        this.userRole = 'free';
        window.userRole = 'free';
        window.isPremiumUser = false;
        
        // Remove premium class from body
        document.body.classList.remove('premium-user');
        document.body.classList.add('free-user');
        
        // Lock premium features
        this.lockPremiumFeatures();
        
        // Hide premium banner
        this.hidePremiumBanner();
    }

    unlockAllPremiumFeatures() {
        console.log('[Premium] Unlocking all premium features...');
        
        // 1. Unlock Recurring Task Section
        this.unlockRecurringSection();
        
        // 2. Unlock Voice Features
        this.unlockVoiceFeatures();
        
        // 3. Unlock Calendar Integration
        this.unlockCalendarIntegration();
        
        // 4. Unlock Telegram Integration
        this.unlockTelegramIntegration();
        
        // 5. Unlock Multilingual Voice
        this.unlockMultilingualVoice();
        
        // 6. Remove all upgrade overlays
        this.removeUpgradeOverlays();
        
        // 7. Enable all premium buttons and controls
        this.enablePremiumControls();
    }

    unlockRecurringSection() {
        const recurringSection = document.getElementById('recurringTaskSection');
        if (recurringSection) {
            console.log('[Premium] Unlocking recurring section');
            recurringSection.style.display = 'block';
            recurringSection.classList.remove('d-none');
            recurringSection.style.opacity = '1';
            recurringSection.style.pointerEvents = 'auto';
            recurringSection.style.visibility = 'visible';
            
            // Remove any upgrade overlays
            const overlays = recurringSection.querySelectorAll('.premium-upgrade-overlay, .upgrade-overlay');
            overlays.forEach(overlay => overlay.remove());
            
            // Enable all form controls in recurring section
            const formControls = recurringSection.querySelectorAll('input, select, textarea, button');
            formControls.forEach(control => {
                control.disabled = false;
                control.style.opacity = '1';
                control.style.pointerEvents = 'auto';
            });
        }
    }

    unlockVoiceFeatures() {
        // Unlock voice recording features
        const voiceSection = document.querySelector('.voice-section');
        if (voiceSection) {
            voiceSection.style.opacity = '1';
            voiceSection.style.pointerEvents = 'auto';
            
            const voiceButtons = voiceSection.querySelectorAll('button');
            voiceButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        }
    }

    unlockCalendarIntegration() {
        const calendarElements = document.querySelectorAll('[data-feature="calendar"], .calendar-integration');
        calendarElements.forEach(element => {
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            element.disabled = false;
        });
    }

    unlockTelegramIntegration() {
        const telegramSection = document.getElementById('telegramIntegrationSection');
        if (telegramSection) {
            telegramSection.style.display = 'block';
            telegramSection.style.opacity = '1';
            telegramSection.style.pointerEvents = 'auto';
            
            // Hide premium overlay
            const overlay = document.getElementById('telegramPremiumOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    unlockMultilingualVoice() {
        const multilingualSection = document.getElementById('multilingualVoiceSection');
        if (multilingualSection) {
            multilingualSection.style.display = 'block';
            multilingualSection.style.opacity = '1';
            multilingualSection.style.pointerEvents = 'auto';
            
            // Hide premium overlay
            const overlay = document.getElementById('multilingualPremiumOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    removeUpgradeOverlays() {
        const overlays = document.querySelectorAll('.premium-upgrade-overlay, .upgrade-overlay, .premium-lock-overlay');
        overlays.forEach(overlay => {
            overlay.remove();
        });
    }

    enablePremiumControls() {
        // Enable all premium buttons
        const premiumButtons = document.querySelectorAll('[data-premium="true"], .premium-button');
        premiumButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
        });
        
        // Enable all premium form controls
        const premiumControls = document.querySelectorAll('[data-premium="true"], .premium-control');
        premiumControls.forEach(control => {
            control.disabled = false;
            control.style.opacity = '1';
            control.style.pointerEvents = 'auto';
        });
    }

    lockPremiumFeatures() {
        console.log('[Premium] Locking premium features...');
        
        // This is called for free users - we'll show features but disable them
        const premiumFeatures = document.querySelectorAll('[data-premium="true"], .premium-feature');
        premiumFeatures.forEach(feature => {
            feature.style.opacity = '0.6';
            feature.style.pointerEvents = 'none';
        });
    }

    showPremiumBanner() {
        const premiumBanner = document.getElementById('premiumBanner');
        if (premiumBanner) {
            premiumBanner.style.display = 'block';
            premiumBanner.style.visibility = 'visible';
            premiumBanner.style.opacity = '1';
        }
    }

    hidePremiumBanner() {
        const premiumBanner = document.getElementById('premiumBanner');
        if (premiumBanner) {
            premiumBanner.style.display = 'none';
            premiumBanner.style.visibility = 'hidden';
            premiumBanner.style.opacity = '0';
        }
    }

    checkAndUnlockFeatures() {
        // Force check and unlock features
        if (this.isPremium) {
            this.unlockAllPremiumFeatures();
        }
        
        // Also check if user is authenticated and premium
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            if (this.premiumEmails.includes(user.email.toLowerCase())) {
                this.setPremiumUser();
            }
        }
    }

    // Public method to force premium status (for testing)
    forcePremiumStatus() {
        console.log('[Premium] Force setting premium status');
        this.setPremiumUser();
    }

    // Public method to check current status
    getStatus() {
        return {
            isPremium: this.isPremium,
            userRole: this.userRole,
            premiumEmails: this.premiumEmails
        };
    }
}

// Initialize the Premium Feature Manager
const premiumManager = new PremiumFeatureManager();

// Make it globally available
window.premiumManager = premiumManager;

// Override the existing premium check functions to use our manager
if (window.recurringTaskManager) {
    const originalUpdateRecurringUI = window.recurringTaskManager.updateRecurringUI;
    window.recurringTaskManager.updateRecurringUI = function() {
        if (window.premiumManager && window.premiumManager.isPremium) {
            console.log('[Recurring] Premium user detected, showing recurring options');
            const recurringSection = document.getElementById('recurringTaskSection');
            if (recurringSection) {
                recurringSection.style.display = 'block';
                recurringSection.classList.remove('d-none');
                recurringSection.style.opacity = '1';
                recurringSection.style.pointerEvents = 'auto';
                recurringSection.style.visibility = 'visible';
            }
        } else {
            console.log('[Recurring] Free user, hiding recurring options');
            const recurringSection = document.getElementById('recurringTaskSection');
            if (recurringSection) {
                recurringSection.style.display = 'none';
                recurringSection.classList.add('d-none');
            }
        }
        
        // Call original function if it exists
        if (originalUpdateRecurringUI) {
            originalUpdateRecurringUI.call(this);
        }
    };
}

// Add a function to manually trigger premium check
window.checkPremiumStatus = function() {
    if (window.premiumManager) {
        window.premiumManager.checkAndUnlockFeatures();
        return window.premiumManager.getStatus();
    }
    return null;
};

// Add a function to force premium status (for testing)
window.forcePremiumStatus = function() {
    if (window.premiumManager) {
        window.premiumManager.forcePremiumStatus();
    }
};

console.log('[Premium] Premium Feature Manager loaded and ready'); 