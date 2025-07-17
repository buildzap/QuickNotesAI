// Utility functions for QuickNotes AI

// Make sure window.utils exists
window.utils = window.utils || {};

// Text utilities
window.utils.text = {
    escapeHtml: (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncate: (str, len = 50) => {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
};

// Date utilities
window.utils.date = {
    formatDateTime: (date) => {
        if (!date) return '';
        const now = new Date();
        const d = new Date(date);

        // If invalid date
        if (isNaN(d.getTime())) return '';

        // Format options
        const dateOptions = { month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit' };

        // If this year, show date without year
        if (d.getFullYear() === now.getFullYear()) {
            return d.toLocaleDateString('en-US', dateOptions) + ' ' +
                   d.toLocaleTimeString('en-US', timeOptions);
        }

        // If different year, include year
        return d.toLocaleDateString('en-US', { ...dateOptions, year: 'numeric' }) + ' ' +
               d.toLocaleTimeString('en-US', timeOptions);
    },

    formatTimeAgo: (date) => {
        if (!date) return '';
        const now = new Date();
        const d = new Date(date);
        const seconds = Math.floor((now - d) / 1000);

        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return window.utils.date.formatDateTime(d);
    },

    isOverdue: (date) => {
        if (!date) return false;
        return new Date(date) < new Date();
    }
};

// UI utilities
window.utils.ui = {
    getPriorityColor: (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    },

    getStatusColor: (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'success';
            case 'in-progress': return 'primary';
            case 'pending': return 'warning';
            default: return 'secondary';
        }
    },

    showLoading: (element, text = 'Loading...') => {
        if (!element) return;
        const originalContent = element.innerHTML;
        element.setAttribute('data-original-content', originalContent);
        element.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${text}
        `;
        element.disabled = true;
    },

    hideLoading: (element) => {
        if (!element) return;
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
            element.innerHTML = originalContent;
            element.removeAttribute('data-original-content');
        }
        element.disabled = false;
    }
};

// Toast notifications
window.utils.toast = {
    show: (message, type = 'info', duration = 3000) => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const colors = {
            success: 'text-bg-success',
            error: 'text-bg-danger',
            warning: 'text-bg-warning',
            info: 'text-bg-info'
        };

        toast.classList.add(colors[type] || colors.info);

        toast.innerHTML = `
            <div class="toast-body d-flex align-items-center">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : 
                             type === 'error' ? 'bi-exclamation-circle' :
                             type === 'warning' ? 'bi-exclamation-triangle' : 
                             'bi-info-circle'} me-2"></i>
                ${window.utils.text.escapeHtml(message)}
            </div>
        `;

        container.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: duration });
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
};

// Initialize theme management
window.utils.theme = {
    initialize: () => {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        function setTheme(theme) {
            document.documentElement.setAttribute('data-bs-theme', theme);
            localStorage.setItem('theme', theme);
            if (themeIcon) {
                if (theme === 'dark') {
                    themeIcon.classList.remove('bi-moon-fill');
                    themeIcon.classList.add('bi-sun-fill');
                } else {
                    themeIcon.classList.remove('bi-sun-fill');
                    themeIcon.classList.add('bi-moon-fill');
                }
            }
        }
        // Initial theme
        const currentTheme = localStorage.getItem('theme') || 'light';
        setTheme(currentTheme);
        if (themeToggle) {
            themeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                const current = document.documentElement.getAttribute('data-bs-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);
                window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
            });
        }
        // Listen for themeChanged event to update icon if theme is changed elsewhere
        window.addEventListener('themeChanged', function(e) {
            setTheme(e.detail.theme);
        });
    }
};
