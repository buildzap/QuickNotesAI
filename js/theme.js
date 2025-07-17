// Theme Toggle Functionality for QuickNotes AI

// Theme management class
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.init();
    }

    // Initialize theme system
    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.updateThemeIcon();
    }

    // Get stored theme from localStorage
    getStoredTheme() {
        return localStorage.getItem('quicknotes-theme');
    }

    // Store theme in localStorage
    setStoredTheme(theme) {
        localStorage.setItem('quicknotes-theme', theme);
    }

    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateThemeIcon();
        
        // Dispatch custom event for other scripts
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: theme } 
        }));
    }

    // Toggle between light and dark themes
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    // Update theme toggle button icon
    updateThemeIcon() {
        const themeIcons = document.querySelectorAll('#themeIcon, .theme-icon');
        const isDark = this.currentTheme === 'dark';
        
        themeIcons.forEach(icon => {
            if (isDark) {
                icon.className = 'bi bi-sun-fill';
            } else {
                icon.className = 'bi bi-moon-fill';
            }
        });
    }

    // Setup event listeners for theme toggle buttons
    setupEventListeners() {
        // Main theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Footer theme toggle button (if exists)
        const footerThemeToggle = document.getElementById('footerThemeToggle');
        if (footerThemeToggle) {
            footerThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Any other theme toggle buttons with class
        const themeButtons = document.querySelectorAll('.theme-toggle-btn');
        themeButtons.forEach(button => {
            button.addEventListener('click', () => this.toggleTheme());
        });
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Check if dark theme is active
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.themeManager = new ThemeManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} 