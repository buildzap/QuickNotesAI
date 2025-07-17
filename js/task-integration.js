// Task Integration Script
// This script integrates the task data loader with the existing task page

// Wait for the page to load and Firebase to be available
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the task page
    if (window.location.pathname.includes('task.html') || 
        document.querySelector('[data-page="task"]') ||
        document.getElementById('taskSummary') ||
        document.getElementById('recentActivities') ||
        document.getElementById('taskHistory')) {
        
        console.log('Task page detected, initializing task data loader...');
        initializeTaskDataLoader();
    }
});

function initializeTaskDataLoader() {
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            clearInterval(checkFirebase);
            
            // Initialize the task data loader
            if (typeof TaskDataLoader !== 'undefined') {
                window.taskDataLoader = new TaskDataLoader();
                console.log('Task data loader initialized on task page');
                
                // Add refresh button to the page if it doesn't exist
                addRefreshButton();
                
                // Set up periodic refresh (every 30 seconds)
                setInterval(() => {
                    if (window.taskDataLoader && window.taskDataLoader.isReady()) {
                        window.taskDataLoader.refresh();
                    }
                }, 30000);
                
            } else {
                console.error('TaskDataLoader class not found');
            }
        }
    }, 100);
}

function addRefreshButton() {
    // Look for existing refresh buttons or add a new one
    const existingRefreshBtn = document.querySelector('[data-action="refresh-tasks"]');
    if (existingRefreshBtn) {
        return; // Already exists
    }
    
    // Try to find a good place to add the refresh button
    const possibleContainers = [
        document.querySelector('.task-header'),
        document.querySelector('.task-controls'),
        document.querySelector('.task-actions'),
        document.querySelector('.btn-group'),
        document.querySelector('.d-flex.justify-content-between')
    ];
    
    let container = null;
    for (const cont of possibleContainers) {
        if (cont) {
            container = cont;
            break;
        }
    }
    
    if (!container) {
        // Create a new container if none found
        const taskSection = document.querySelector('.task-section') || 
                           document.querySelector('.main-content') ||
                           document.querySelector('.container');
        
        if (taskSection) {
            const newContainer = document.createElement('div');
            newContainer.className = 'task-controls d-flex justify-content-between align-items-center mb-3';
            newContainer.innerHTML = `
                <h4>Task Management</h4>
                <div class="btn-group">
                    <button class="btn btn-outline-primary btn-sm" data-action="refresh-tasks" onclick="refreshTaskData()">
                        <i class="fas fa-sync-alt me-1"></i>Refresh
                    </button>
                </div>
            `;
            taskSection.insertBefore(newContainer, taskSection.firstChild);
        }
    } else {
        // Add refresh button to existing container
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-outline-primary btn-sm ms-2';
        refreshBtn.setAttribute('data-action', 'refresh-tasks');
        refreshBtn.onclick = refreshTaskData;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Refresh';
        container.appendChild(refreshBtn);
    }
}

// Global function to refresh task data
function refreshTaskData() {
    console.log('Manual refresh triggered');
    if (window.taskDataLoader && window.taskDataLoader.isReady()) {
        window.taskDataLoader.refresh();
        
        // Show a brief success message
        showNotification('Task data refreshed successfully', 'success');
    } else {
        console.error('Task data loader not ready');
        showNotification('Unable to refresh task data', 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Override existing task loading functions if they exist
if (typeof loadTaskSummary === 'function') {
    const originalLoadTaskSummary = loadTaskSummary;
    loadTaskSummary = function() {
        console.log('Intercepting loadTaskSummary call');
        if (window.taskDataLoader && window.taskDataLoader.isReady()) {
            window.taskDataLoader.refresh();
        } else {
            originalLoadTaskSummary.apply(this, arguments);
        }
    };
}

if (typeof loadRecentActivities === 'function') {
    const originalLoadRecentActivities = loadRecentActivities;
    loadRecentActivities = function() {
        console.log('Intercepting loadRecentActivities call');
        if (window.taskDataLoader && window.taskDataLoader.isReady()) {
            window.taskDataLoader.refresh();
        } else {
            originalLoadRecentActivities.apply(this, arguments);
        }
    };
}

if (typeof loadTaskHistory === 'function') {
    const originalLoadTaskHistory = loadTaskHistory;
    loadTaskHistory = function() {
        console.log('Intercepting loadTaskHistory call');
        if (window.taskDataLoader && window.taskDataLoader.isReady()) {
            window.taskDataLoader.refresh();
        } else {
            originalLoadTaskHistory.apply(this, arguments);
        }
    };
}

// Export functions for global use
window.refreshTaskData = refreshTaskData;
window.showNotification = showNotification; 