// Premium Navigation Manager - Lightweight and Fast
// Adds Team and Team Dashboard links for premium users

class PremiumNavigation {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        if (this.initialized) return;
        
        console.log('[PremiumNav] Setting up premium navigation...');
        
        // Add team links to navigation
        this.addTeamLinks();
        
        // Setup visibility control
        this.setupVisibilityControl();
        
        this.initialized = true;
    }

    addTeamLinks() {
        // Find all navigation containers
        const navContainers = document.querySelectorAll('.navbar-nav');
        
        navContainers.forEach((nav, index) => {
            // Skip if team links already exist
            if (nav.querySelector('.premium-only')) {
                console.log('[PremiumNav] Team links already exist in nav', index);
                return;
            }
            
            // Add team links
            const teamLinks = `
                <li class="nav-item premium-only" style="display: none;">
                    <a class="nav-link" href="team.html">
                        <i class="fas fa-users me-1"></i>Team
                    </a>
                </li>
                <li class="nav-item premium-only" style="display: none;">
                    <a class="nav-link" href="team-dashboard.html">
                        <i class="fas fa-chart-line me-1"></i>Team Dashboard
                    </a>
                </li>
            `;
            
            nav.insertAdjacentHTML('beforeend', teamLinks);
            console.log('[PremiumNav] Added team links to nav', index);
        });
    }

    setupVisibilityControl() {
        // Function to check and update premium link visibility
        const updateVisibility = () => {
            const premiumLinks = document.querySelectorAll('.premium-only');
            if (premiumLinks.length === 0) return;
            
            // Check premium status
            const isPremium = this.checkPremiumStatus();
            
            premiumLinks.forEach(link => {
                link.style.display = isPremium ? 'block' : 'none';
            });
            
            console.log('[PremiumNav] Updated visibility - Premium:', isPremium);
        };

        // Check premium status
        this.checkPremiumStatus = () => {
            // Check multiple indicators of premium status
            return (
                window.userRole === 'premium' ||
                window.isPremiumUser === true ||
                document.body.classList.contains('premium-user') ||
                this.isPremiumEmail()
            );
        };

        // Check if current user email is premium
        this.isPremiumEmail = () => {
            const premiumEmails = [
                'premium1@test.com',
                'premium2@test.com',
                'admin@quicknotes.ai',
                'premium@quicknotes.ai'
            ];
            
            if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                return premiumEmails.includes(window.firebaseAuth.currentUser.email.toLowerCase());
            }
            
            return false;
        };

        // Initial check
        updateVisibility();
        
        // Check when Firebase auth changes
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(() => {
                setTimeout(updateVisibility, 500);
            });
        }
        
        // Periodic check (every 3 seconds)
        setInterval(updateVisibility, 3000);
        
        // Check when user role changes
        const originalSetUserRole = window.setUserRole;
        if (originalSetUserRole) {
            window.setUserRole = function(role) {
                originalSetUserRole(role);
                setTimeout(updateVisibility, 100);
            };
        }
    }
}

// Initialize premium navigation
let premiumNav;
try {
    premiumNav = new PremiumNavigation();
    console.log('[PremiumNav] Premium navigation initialized successfully');
} catch (error) {
    console.error('[PremiumNav] Error initializing:', error);
}

// Make it globally available
window.premiumNav = premiumNav; 