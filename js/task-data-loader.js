// Task Data Loader Utility
// This script provides comprehensive task data loading functionality

class TaskDataLoader {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Wait for auth state to be determined
            await new Promise((resolve) => {
                const unsubscribe = this.auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    this.isInitialized = true;
                    unsubscribe();
                    resolve();
                });
            });

            if (this.currentUser) {
                console.log('TaskDataLoader initialized for user:', this.currentUser.email);
                this.loadAllTaskData();
            } else {
                console.log('No authenticated user found');
            }
        } catch (error) {
            console.error('TaskDataLoader initialization failed:', error);
        }
    }

    // Load all task-related data
    async loadAllTaskData() {
        if (!this.currentUser) {
            console.warn('No authenticated user for loading task data');
            return;
        }

        try {
            console.log('Loading all task data...');
            
            // Load data in parallel for better performance
            const [tasks, history, activities] = await Promise.all([
                this.loadTasks(),
                this.loadTaskHistory(),
                this.loadRecentActivities()
            ]);

            // Update UI components
            this.updateTaskSummary(tasks);
            this.updateRecentActivities(activities);
            this.updateTaskHistory(history);
            
            // Update task grid if renderTaskGrid function exists
            if (typeof window.renderTaskGrid === 'function') {
                console.log('Calling renderTaskGrid with', tasks.length, 'tasks');
                window.renderTaskGrid(1); // Render first page
            } else {
                console.log('renderTaskGrid function not found, updating task state');
                // Update global task state
                if (window.taskState) {
                    window.taskState.tasks = tasks;
                    console.log('Updated window.taskState.tasks with', tasks.length, 'tasks');
                }
            }
            
            // Force render task grid after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (typeof window.renderTaskGrid === 'function') {
                    console.log('Force calling renderTaskGrid after delay');
                    window.renderTaskGrid(1);
                }
            }, 500);

            console.log('All task data loaded successfully');
        } catch (error) {
            console.error('Failed to load task data:', error);
        }
    }

    // Load tasks from Firestore
    async loadTasks() {
        try {
            const snapshot = await this.db.collection('tasks')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            const tasks = [];
            snapshot.forEach(doc => {
                tasks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Loaded ${tasks.length} tasks`);
            return tasks;
        } catch (error) {
            console.error('Failed to load tasks:', error);
            return [];
        }
    }

    // Load task history
    async loadTaskHistory() {
        try {
            const snapshot = await this.db.collection('taskHistory')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();

            const history = [];
            snapshot.forEach(doc => {
                history.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Loaded ${history.length} task history entries`);
            return history;
        } catch (error) {
            console.error('Failed to load task history:', error);
            return [];
        }
    }

    // Load recent activities
    async loadRecentActivities() {
        try {
            // First try with the composite query
            try {
                const snapshot = await this.db.collection('recentActivities')
                    .where('userId', '==', this.currentUser.uid)
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();

                const activities = [];
                snapshot.forEach(doc => {
                    activities.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                console.log(`Loaded ${activities.length} recent activities`);
                return activities;
            } catch (indexError) {
                // If composite index is missing, fall back to simple query and sort in memory
                console.warn('Composite index missing for recentActivities, using fallback query');
                const snapshot = await this.db.collection('recentActivities')
                    .where('userId', '==', this.currentUser.uid)
                    .get();

                const activities = [];
                snapshot.forEach(doc => {
                    activities.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Sort in memory by timestamp descending
                activities.sort((a, b) => {
                    const timeA = a.timestamp ? a.timestamp.toDate() : new Date(0);
                    const timeB = b.timestamp ? b.timestamp.toDate() : new Date(0);
                    return timeB - timeA;
                });

                // Limit to 10 items
                const limitedActivities = activities.slice(0, 10);
                console.log(`Loaded ${limitedActivities.length} recent activities (fallback method)`);
                return limitedActivities;
            }
        } catch (error) {
            console.error('Failed to load recent activities:', error);
            return [];
        }
    }

    // Update task summary in UI
    updateTaskSummary(tasks) {
        const summaryContainer = document.getElementById('taskSummary') || 
                                document.getElementById('taskSummaryContainer') ||
                                document.querySelector('[data-section="task-summary"]');

        if (!summaryContainer) {
            console.warn('Task summary container not found');
            return;
        }

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const pendingTasks = tasks.filter(task => task.status === 'pending').length;
        const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

        const summaryHTML = `
            <div class="row g-3">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h4>${totalTasks}</h4>
                            <small>Total Tasks</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h4>${completedTasks}</h4>
                            <small>Completed</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h4>${inProgressTasks}</h4>
                            <small>In Progress</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h4>${pendingTasks}</h4>
                            <small>Pending</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        summaryContainer.innerHTML = summaryHTML;
    }

    // Update recent activities in UI
    updateRecentActivities(activities) {
        const activitiesContainer = document.getElementById('recentActivities') || 
                                   document.getElementById('recentActivitiesContainer') ||
                                   document.querySelector('[data-section="recent-activities"]');

        if (!activitiesContainer) {
            console.warn('Recent activities container not found');
            return;
        }

        if (activities.length === 0) {
            activitiesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-clock fa-2x mb-3"></i>
                    <p>No recent activities</p>
                </div>
            `;
            return;
        }

        const activitiesHTML = activities.map(activity => {
            const timestamp = activity.timestamp ? new Date(activity.timestamp.toDate()).toLocaleString() : 'Unknown';
            return `
                <div class="activity-item d-flex align-items-center p-2 border-bottom">
                    <div class="activity-icon me-3">
                        <i class="fas fa-${this.getActivityIcon(activity.type)} text-primary"></i>
                    </div>
                    <div class="activity-content flex-grow-1">
                        <div class="activity-text">${activity.description || 'Activity performed'}</div>
                        <small class="text-muted">${timestamp}</small>
                    </div>
                </div>
            `;
        }).join('');

        activitiesContainer.innerHTML = activitiesHTML;
    }

    // Update task history in UI
    updateTaskHistory(history) {
        const historyContainer = document.getElementById('taskHistory') || 
                                document.getElementById('taskHistoryContainer') ||
                                document.querySelector('[data-section="task-history"]');

        if (!historyContainer) {
            console.warn('Task history container not found');
            return;
        }

        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-history fa-2x mb-3"></i>
                    <p>No task history available</p>
                </div>
            `;
            return;
        }

        const historyHTML = history.map(item => {
            const timestamp = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : 'Unknown';
            return `
                <div class="history-item d-flex align-items-center p-2 border-bottom">
                    <div class="history-icon me-3">
                        <i class="fas fa-${this.getHistoryIcon(item.action)} text-${this.getHistoryColor(item.action)}"></i>
                    </div>
                    <div class="history-content flex-grow-1">
                        <div class="history-text">${item.description || 'Task action performed'}</div>
                        <small class="text-muted">${timestamp}</small>
                    </div>
                </div>
            `;
        }).join('');

        historyContainer.innerHTML = historyHTML;
    }

    // Helper methods for icons and colors
    getActivityIcon(type) {
        const iconMap = {
            'task_created': 'plus-circle',
            'task_updated': 'edit',
            'task_completed': 'check-circle',
            'task_deleted': 'trash',
            'default': 'clock'
        };
        return iconMap[type] || iconMap.default;
    }

    getHistoryIcon(action) {
        const iconMap = {
            'created': 'plus-circle',
            'updated': 'edit',
            'completed': 'check-circle',
            'deleted': 'trash',
            'assigned': 'user-plus',
            'default': 'history'
        };
        return iconMap[action] || iconMap.default;
    }

    getHistoryColor(action) {
        const colorMap = {
            'created': 'success',
            'updated': 'primary',
            'completed': 'success',
            'deleted': 'danger',
            'assigned': 'info',
            'default': 'secondary'
        };
        return colorMap[action] || colorMap.default;
    }

    // Public method to refresh data
    async refresh() {
        console.log('Refreshing task data...');
        await this.loadAllTaskData();
    }

    // Public method to check if loader is ready
    isReady() {
        return this.isInitialized && this.currentUser !== null;
    }
}

// Initialize the task data loader when the page loads
let taskDataLoader = null;

document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            clearInterval(checkFirebase);
            taskDataLoader = new TaskDataLoader();
            
            // Make it globally available
            window.taskDataLoader = taskDataLoader;
            
            console.log('TaskDataLoader initialized');
        }
    }, 100);
});

// Export for use in other scripts
window.TaskDataLoader = TaskDataLoader; 