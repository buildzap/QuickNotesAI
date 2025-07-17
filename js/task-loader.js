// task-loader.js - Centralized task loading for task and dashboard pages

let taskLoaderState = {
    tasks: [],
    currentUser: null,
    unsubscribeListener: null,
    isLoading: false
};

// Initialize task loader
async function initTaskLoader() {
    console.log('[Task Loader] Initializing task loader...');
    
    try {
        // Wait for Firebase to initialize
        if (window.firebaseInitialized) {
            await window.firebaseInitialized;
            console.log('[Task Loader] Firebase initialized');
        } else {
            console.log('[Task Loader] Waiting for Firebase to be available...');
            // Wait for Firebase to be available
            await new Promise((resolve) => {
                const checkFirebase = () => {
                    if (window.firebase && window.firebaseAuth) {
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                checkFirebase();
            });
        }
        
        // Wait for auth state to be ready
        await new Promise((resolve) => {
            if (window.firebaseAuth) {
                const unsubscribe = window.firebaseAuth.onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            } else {
                // If no Firebase auth, resolve with null
                resolve(null);
            }
        });
        
        // Check authentication
        const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
        if (!user) {
            console.log('[Task Loader] No authenticated user, waiting for existing auth system...');
            // Don't redirect, let the existing system handle auth
            return;
        }
        
        taskLoaderState.currentUser = user;
        console.log('[Task Loader] User authenticated:', user.email);
        
        // Setup task listener
        setupTaskListener();
        
        // Update UI
        updateUserInfo();
        
        console.log('[Task Loader] Task loader initialized successfully');
        
    } catch (error) {
        console.error('[Task Loader] Initialization error:', error);
        // Don't show error, let existing system handle it
    }
}

// Setup Firestore listener for tasks
function setupTaskListener() {
    if (taskLoaderState.unsubscribeListener) {
        taskLoaderState.unsubscribeListener();
        taskLoaderState.unsubscribeListener = null;
    }
    
    const user = taskLoaderState.currentUser;
    if (!user) {
        console.warn('[Task Loader] No authenticated user for Firestore listener');
        return;
    }
    
    console.log('[Task Loader] Setting up Firestore listener for user:', user.uid);
    
    const db = window.firebase.firestore();
    taskLoaderState.unsubscribeListener = db.collection('tasks')
        .where('userId', '==', user.uid)
        .onSnapshot(
            (snapshot) => {
                const tasks = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamps to JS Dates
                    const parseDate = (d) => {
                        if (!d) return null;
                        if (d instanceof Date) return d;
                        if (d.toDate) return d.toDate();
                        return new Date(d);
                    };
                    
                    tasks.push({
                        id: doc.id,
                        ...data,
                        dueDate: parseDate(data.dueDate),
                        createdAt: parseDate(data.createdAt),
                        updatedAt: parseDate(data.updatedAt),
                    });
                });
                
                taskLoaderState.tasks = tasks;
                console.log('[Task Loader] Tasks loaded from Firestore:', tasks.length);
                console.log('[Task Loader] Task details:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
                
                // Update UI based on current page
                updatePageUI(tasks);
                
                // Also sync with existing task system
                if (typeof window.syncTasksFromLoader === 'function') {
                    window.syncTasksFromLoader(tasks);
                }
                
                // Show success message if this is the first load
                if (tasks.length > 0) {
                    console.log('[Task Loader] ✅ Task data loaded successfully!');
                    // You can uncomment the next line to show a toast message
                    // if (typeof showToast === 'function') {
                    //     showToast(`Loaded ${tasks.length} tasks successfully`, 'success');
                    // }
                } else {
                    console.log('[Task Loader] ⚠️ No tasks found. You can create a test task using the "Test Task" button.');
                }
                
            },
            (error) => {
                console.error('[Task Loader] Firestore listener error:', error);
                showLoaderError('Error loading tasks. Please refresh.');
            }
        );
}

// Update UI based on current page
function updatePageUI(tasks) {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'task.html' || currentPage === 'task') {
        updateTaskPage(tasks);
    } else if (currentPage === 'dashboard.html' || currentPage === 'dashboard') {
        updateDashboardPage(tasks);
    }
}

// Update task page UI
function updateTaskPage(tasks) {
    console.log('[Task Loader] Updating task page with', tasks.length, 'tasks');
    
    // Update the existing task state
    if (window.taskState) {
        window.taskState.tasks = tasks;
        console.log('[Task Loader] Updated window.taskState.tasks with', tasks.length, 'tasks');
        
        // Trigger the existing render function
        if (typeof window.renderTaskGrid === 'function') {
            window.renderTaskGrid();
        }
    }
    
    // Update task summary
    updateTaskSummary(tasks);
    
    // Update progress overview
    if (typeof window.updateProgressOverview === 'function') {
        window.updateProgressOverview();
    }
    
    // Update priority distribution
    if (typeof window.updatePriorityChart === 'function') {
        window.updatePriorityChart();
    }
    
    // Update recent activity
    if (typeof window.updateRecentActivity === 'function') {
        window.updateRecentActivity();
    }
    
    // Initialize recurring functionality if not already done
    if (typeof window.initializeRecurringTaskFunctionality === 'function') {
        window.initializeRecurringTaskFunctionality();
    }
    
    // Force update all UI components
    setTimeout(() => {
        console.log('[Task Loader] Forcing UI updates...');
        
        // Update task stats
        if (typeof window.updateTaskStats === 'function') {
            window.updateTaskStats();
        }
        
        // Update dashboard stats
        if (typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }
        
        // Force re-render task grid
        if (typeof window.renderTaskGrid === 'function') {
            window.renderTaskGrid();
        }
        
        // Update all analytics sections
        if (typeof window.updateProgressOverview === 'function') {
            window.updateProgressOverview();
        }
        
        if (typeof window.updatePriorityChart === 'function') {
            window.updatePriorityChart();
        }
        
        if (typeof window.updateRecentActivity === 'function') {
            window.updateRecentActivity();
        }
        
        console.log('[Task Loader] UI updates completed');
    }, 500);
}

// Update dashboard page UI
function updateDashboardPage(tasks) {
    console.log('[Task Loader] Updating dashboard page with', tasks.length, 'tasks');
    
    // Update the existing task state
    if (window.taskState) {
        window.taskState.tasks = tasks;
        console.log('[Task Loader] Updated window.taskState.tasks with', tasks.length, 'tasks');
    }
    
    // Update dashboard stats and charts
    if (window.updateStats && typeof window.updateStats === 'function') {
        window.updateStats(tasks);
    }
    
    if (window.renderCharts && typeof window.renderCharts === 'function') {
        window.renderCharts(tasks);
    }
    
    // Update any other dashboard functions that might exist
    if (typeof window.updateProgressOverview === 'function') {
        window.updateProgressOverview();
    }
    
    if (typeof window.updatePriorityChart === 'function') {
        window.updatePriorityChart();
    }
    
    if (typeof window.updateRecentActivity === 'function') {
        window.updateRecentActivity();
    }
    
    // Force update all dashboard components
    setTimeout(() => {
        console.log('[Task Loader] Forcing dashboard updates...');
        
        // Update stats again to ensure they're current
        if (window.updateStats && typeof window.updateStats === 'function') {
            window.updateStats(tasks);
        }
        
        // Re-render charts
        if (window.renderCharts && typeof window.renderCharts === 'function') {
            window.renderCharts(tasks);
        }
        
        // Update any other dashboard functions
        if (typeof window.updateProgressOverview === 'function') {
            window.updateProgressOverview();
        }
        
        if (typeof window.updatePriorityChart === 'function') {
            window.updatePriorityChart();
        }
        
        if (typeof window.updateRecentActivity === 'function') {
            window.updateRecentActivity();
        }
        
        console.log('[Task Loader] Dashboard updates completed');
    }, 500);
}

// Task grid rendering is handled by the existing task.js functionality
// This function is no longer needed as we're using the existing renderTaskGrid

// Task tile creation and management is handled by the existing task.js functionality
// These functions are no longer needed as we're using the existing task management system

// Update task summary
function updateTaskSummary(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    
    // Update summary elements if they exist
    const elements = {
        'totalTasks': totalTasks,
        'completedTasks': completedTasks,
        'pendingTasks': pendingTasks,
        'inProgressTasks': inProgressTasks
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Update completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const completionRateElement = document.getElementById('completionRate');
    if (completionRateElement) {
        completionRateElement.textContent = `${completionRate}%`;
    }
}

// Dashboard functions are handled by dashboard.js
// These functions are no longer needed as we're using the existing dashboard functionality

// Update user info
function updateUserInfo() {
    const user = taskLoaderState.currentUser;
    if (!user) return;
    
    // Update user welcome message
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome) {
        const displayName = user.displayName || user.email.split('@')[0];
        userWelcome.textContent = `Welcome, ${displayName}`;
    }
    
    // Show user section
    const userSection = document.getElementById('userSection');
    if (userSection) {
        userSection.style.display = 'flex';
    }
}

// Utility functions - REMOVED to avoid conflicts with task.js
// These functions are already defined in task.js and utils.js

// escapeHtml function removed - already defined in task.js

function showLoaderMessage(message) {
    console.log('[Task Loader]', message);
    // You can implement toast notifications here
}

function showLoaderError(message) {
    console.error('[Task Loader]', message);
    // You can implement error notifications here
}

// CSS is handled by the existing task.js styling
// This function is no longer needed as we're using the existing styles

// Initialize when DOM is loaded, but wait a bit for other scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Task Loader] DOM loaded, waiting for other scripts...');
    // Wait a bit for other scripts to initialize
    setTimeout(() => {
        console.log('[Task Loader] Initializing task loader...');
        initTaskLoader();
    }, 1000);
});

// Export for use in other files
window.taskLoader = {
    initTaskLoader,
    getTasks: () => taskLoaderState.tasks,
    getCurrentUser: () => taskLoaderState.currentUser,
    syncTasks: () => {
        console.log('[Task Loader] Syncing tasks with existing system...');
        if (window.taskState && taskLoaderState.tasks.length > 0) {
            window.taskState.tasks = taskLoaderState.tasks;
            console.log('[Task Loader] Synced', taskLoaderState.tasks.length, 'tasks to window.taskState');
            
            // Force update all UI components
            if (typeof window.renderTaskGrid === 'function') {
                window.renderTaskGrid();
            }
            
            if (typeof window.updateTaskStats === 'function') {
                window.updateTaskStats();
            }
            
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            
            if (typeof window.updateProgressOverview === 'function') {
                window.updateProgressOverview();
            }
            
            if (typeof window.updatePriorityChart === 'function') {
                window.updatePriorityChart();
            }
            
            if (typeof window.updateRecentActivity === 'function') {
                window.updateRecentActivity();
            }
            
            if (typeof window.updateStats === 'function') {
                window.updateStats(taskLoaderState.tasks);
            }
            
            if (typeof window.renderCharts === 'function') {
                window.renderCharts(taskLoaderState.tasks);
            }
        }
    }
};

// Auto-sync tasks every 2 seconds to ensure UI is updated
setInterval(() => {
    if (taskLoaderState.tasks.length > 0 && window.taskState) {
        window.taskLoader.syncTasks();
    }
}, 2000);

// Test task and reload functions removed - already defined in task.html 