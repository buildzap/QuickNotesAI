/**
 * Calendar UI Manager
 * Handles all calendar-related UI updates and interactions
 */
const calendarUI = {
    /**
     * Initialize calendar UI
     */
    async initialize() {
        // Get UI elements
        const connectBtn = document.getElementById('connect-google-btn');
        const disconnectBtn = document.getElementById('disconnect-google-btn');
        const syncBtn = document.getElementById('sync-task-btn');
        const autoSyncToggle = document.getElementById('auto-sync-toggle');
        const calendarPremium = document.getElementById('calendar-premium');
        const calendarNotPremium = document.getElementById('calendar-not-premium');
        const calendarConnected = document.getElementById('calendar-connected');
        const calendarDisconnected = document.getElementById('calendar-disconnected');

        // Check premium status
        const isPremium = await window.checkPremiumStatus();
        
        // Show/hide premium sections
        calendarPremium?.classList.toggle('d-none', !isPremium);
        calendarNotPremium?.classList.toggle('d-none', isPremium);

        if (isPremium) {
            // Set up event listeners
            connectBtn?.addEventListener('click', this.handleConnect.bind(this));
            disconnectBtn?.addEventListener('click', this.handleDisconnect.bind(this));
            syncBtn?.addEventListener('click', this.handleSync.bind(this));
            autoSyncToggle?.addEventListener('change', (e) => {
                window.calendarService.setAutoSync(e.target.checked);
            });

            // Initialize auto-sync state
            if (autoSyncToggle) {
                autoSyncToggle.checked = window.calendarService.getAutoSync();
            }

            // Update connection status
            const isConnected = window.calendarService.isConnected();
            calendarConnected?.classList.toggle('d-none', !isConnected);
            calendarDisconnected?.classList.toggle('d-none', isConnected);
        }
    },

    /**
     * Handle calendar connection
     */
    async handleConnect() {
        try {
            await window.calendarService.initialize();
            await window.calendarService.getAccessToken();
            this.updateConnectionStatus(true);
            window.showToast('Connected to Google Calendar', 'success');
        } catch (error) {
            console.error('[Calendar UI] Connection error:', error);
            window.showToast('Failed to connect to Google Calendar', 'error');
        }
    },

    /**
     * Handle calendar disconnection
     */
    async handleDisconnect() {
        try {
            window.calendarService.disconnect();
            this.updateConnectionStatus(false);
            window.showToast('Disconnected from Google Calendar', 'success');
        } catch (error) {
            console.error('[Calendar UI] Disconnection error:', error);
            window.showToast('Failed to disconnect from Google Calendar', 'error');
        }
    },

    /**
     * Handle task sync
     */
    async handleSync() {
        try {
            const selectedTasks = this.getSelectedTasks();
            if (selectedTasks.length === 0) {
                window.showToast('Please select tasks to sync', 'warning');
                return;
            }

            let syncedCount = 0;
            for (const task of selectedTasks) {
                try {
                    const event = await window.calendarService.addTaskToCalendar(task);
                    await this.updateTaskSyncStatus(task.id, event.id);
                    syncedCount++;
                } catch (error) {
                    console.error(`[Calendar UI] Failed to sync task ${task.id}:`, error);
                }
            }

            window.showToast(`Synced ${syncedCount} tasks with Google Calendar`, 'success');
        } catch (error) {
            console.error('[Calendar UI] Sync error:', error);
            window.showToast('Failed to sync tasks with calendar', 'error');
        }
    },

    /**
     * Update connection status in UI
     */
    updateConnectionStatus(isConnected) {
        const calendarConnected = document.getElementById('calendar-connected');
        const calendarDisconnected = document.getElementById('calendar-disconnected');
        
        if (calendarConnected && calendarDisconnected) {
            calendarConnected.classList.toggle('d-none', !isConnected);
            calendarDisconnected.classList.toggle('d-none', isConnected);
        }
    },

    /**
     * Get selected tasks from the UI
     */
    getSelectedTasks() {
        const selectedRows = document.querySelectorAll('.task-row.selected');
        return Array.from(selectedRows).map(row => ({
            id: row.dataset.taskId,
            title: row.querySelector('.task-title')?.textContent,
            description: row.querySelector('.task-description')?.textContent,
            dueDate: row.querySelector('.task-due-date')?.dataset.date
        })).filter(task => task.id && task.title && task.dueDate);
    },

    /**
     * Update task sync status in Firestore
     */
    async updateTaskSyncStatus(taskId, eventId) {
        try {
            await window.firebaseDb.collection('tasks').doc(taskId).update({
                syncedWithCalendar: true,
                calendarEventId: eventId,
                lastSyncDate: new Date()
            });
        } catch (error) {
            console.error('[Calendar UI] Failed to update task sync status:', error);
            throw error;
        }
    }
};

// Export for use in other files
window.calendarUI = calendarUI;
