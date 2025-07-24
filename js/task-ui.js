// Task UI Management Module
// Handles all UI-related functionality for the task page

class TaskUIManager {
    constructor() {
        this.currentTags = [];
        this.editingState = {
            isEditing: false,
            editingTaskId: null
        };
        this.isVoiceProcessing = false;
        this.eventListenersSetup = false;
    }

    // Initialize UI components
    init() {
        this.setupEventListeners();
        this.initializeFormFields();
        this.setupVoiceUI();
        this.setupDebugUI();
        this.setupPremiumUI();
    }

    // Setup all event listeners
    setupEventListeners() {
        if (this.eventListenersSetup) return;
        
        console.log('Setting up task UI event listeners...');
        
        // Form submission
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Input method change
        const inputMethodSelect = document.getElementById('taskInputMethod');
        if (inputMethodSelect) {
            inputMethodSelect.addEventListener('change', () => {
                this.updateInputMethodIndicator();
            });
        }

        // Manual input detection
        this.setupManualInputDetection();

        // Tag management
        this.setupTagManagement();

        // Voice recording
        this.setupVoiceRecording();

        // Debug buttons
        this.setupDebugButtons();

        this.eventListenersSetup = true;
        console.log('Task UI event listeners setup completed');
    }

    // Handle form submission
    async handleFormSubmission() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        
        // Add animation
        form.classList.add('submitting');
        
        // Auto-detect input method based on user interaction
        let inputMethod = document.getElementById('taskInputMethod').value;
        
        // Check if user has manually interacted with any form fields
        const hasManualInput = this.checkManualInput();
        
        // Only override to manual if input method is not explicitly set to voice
        if (hasManualInput && inputMethod !== 'voice' && !this.isVoiceProcessing) {
            inputMethod = 'manual';
            document.getElementById('taskInputMethod').value = 'manual';
            this.updateInputMethodIndicator();
            console.log('Manual input detected - setting Input Method to manual');
        } else if (inputMethod === 'voice' || this.isVoiceProcessing) {
            console.log('Voice input method preserved - not overriding to manual');
            // Clear voice processing flag
            this.isVoiceProcessing = false;
        }
        
        const now = new Date().toISOString();
        // Get recurring data if enabled
        const recurrenceData = this.getRecurrenceData();
        
        const newTask = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            dueDate: document.getElementById('taskDueDate').value,
            recurring: document.getElementById('taskRecurring').value,
            inputMethod: inputMethod,
            tags: this.currentTags || [],
            createdAt: document.getElementById('taskCreatedAt').value || now,
            updatedAt: now,
            userId: window.currentUser ? window.currentUser.uid : null,
            ...recurrenceData // Spread recurring data if available
        };

        console.log('Adding new task:', newTask);
        
        try {
            if (window.currentUser && (window.firebaseDb || firebase)) {
                // Add to Firebase
                const db = window.firebaseDb || firebase.firestore();
                const docRef = await db.collection('tasks').add(newTask);
                console.log('Task added to Firebase with ID:', docRef.id);
                this.showToast('Task added successfully to Firebase!', 'success');
            } else {
                // Fallback to local storage
                newTask.id = Date.now();
                window.taskState.tasks.unshift(newTask);
                this.saveTasks();
                this.showToast('Task added successfully to local storage!', 'success');
            }
            
            // Update all stats and UI immediately
            this.updateTaskStats();
            this.updateDashboardStats();
            this.renderTaskGrid();
            
            // Force refresh progress overview
            setTimeout(() => {
                this.updateProgressOverview();
                if (typeof updateTaskSummary === 'function') {
                    updateTaskSummary(window.taskState.tasks);
                }
                console.log('Task Summary updated after adding new task');
            }, 100);
            
            // Reset form
            form.reset();
            this.currentTags = [];
            this.updateTagsDisplay();
            this.initializeFormFields();
            
            // Clear voice processing flag
            this.isVoiceProcessing = false;
            
            // Navigate to Task Summary & Task History section
            setTimeout(() => {
                this.scrollToTaskHistory();
            }, 500);
            
        } catch (error) {
            console.error('Error adding task:', error);
            this.showToast('Error adding task. Please try again.', 'danger');
            // Clear voice processing flag on error too
            this.isVoiceProcessing = false;
        }
        
        // Remove animation
        setTimeout(() => {
            form.classList.remove('submitting');
        }, 500);
    }

    // Check if user has manually input data
    checkManualInput() {
        const titleField = document.getElementById('taskTitle');
        const descriptionField = document.getElementById('taskDescription');
        const priorityField = document.getElementById('taskPriority');
        const statusField = document.getElementById('taskStatus');
        const dueDateField = document.getElementById('taskDueDate');
        const recurringField = document.getElementById('taskRecurring');
        
        return titleField.dataset.manualInput === 'true' || 
               descriptionField.dataset.manualInput === 'true' ||
               priorityField.dataset.manualInput === 'true' ||
               statusField.dataset.manualInput === 'true' ||
               dueDateField.dataset.manualInput === 'true' ||
               recurringField.dataset.manualInput === 'true';
    }

    // Setup manual input detection
    setupManualInputDetection() {
        const fields = ['taskTitle', 'taskDescription', 'taskPriority', 'taskStatus', 'taskDueDate', 'taskRecurring'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    field.dataset.manualInput = 'true';
                });
                field.addEventListener('change', () => {
                    field.dataset.manualInput = 'true';
                });
            }
        });
    }

    // Setup tag management
    setupTagManagement() {
        const addTagBtn = document.getElementById('addTagBtn');
        const tagInput = document.getElementById('tagInput');
        
        if (addTagBtn && tagInput) {
            addTagBtn.addEventListener('click', () => {
                this.addTag();
            });
            
            tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTag();
                }
            });
        }
    }

    // Add a new tag
    addTag() {
        const tagInput = document.getElementById('tagInput');
        const tag = tagInput.value.trim();
        
        if (tag && !this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.updateTagsDisplay();
            tagInput.value = '';
        }
    }

    // Update tags display
    updateTagsDisplay() {
        const tagsContainer = document.getElementById('tagsContainer');
        if (!tagsContainer) return;
        
        tagsContainer.innerHTML = '';
        
        this.currentTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'badge bg-primary me-1 mb-1';
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="btn-close btn-close-white ms-1" 
                        onclick="taskUI.removeTag('${tag}')" style="font-size: 0.5em;"></button>
            `;
            tagsContainer.appendChild(tagElement);
        });
    }

    // Remove a tag
    removeTag(tag) {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.updateTagsDisplay();
    }

    // Setup voice recording
    setupVoiceRecording() {
        const voiceRecordBtn = document.getElementById('voiceRecordBtn');
        const voiceStopBtn = document.getElementById('voiceStopBtn');
        
        if (voiceRecordBtn) {
            voiceRecordBtn.addEventListener('click', () => {
                this.startVoiceRecording();
            });
        }
        
        if (voiceStopBtn) {
            voiceStopBtn.addEventListener('click', () => {
                this.stopVoiceRecording();
            });
        }
    }

    // Start voice recording
    startVoiceRecording() {
        this.isVoiceProcessing = true;
        this.setInputMethodToVoice();
        
        // Update UI
        const voiceRecordBtn = document.getElementById('voiceRecordBtn');
        const voiceStopBtn = document.getElementById('voiceStopBtn');
        
        if (voiceRecordBtn) voiceRecordBtn.style.display = 'none';
        if (voiceStopBtn) voiceStopBtn.style.display = 'inline-block';
        
        // Start voice recognition if available
        if (window.voiceManager) {
            window.voiceManager.start();
        }
    }

    // Stop voice recording
    stopVoiceRecording() {
        this.isVoiceProcessing = false;
        
        // Update UI
        const voiceRecordBtn = document.getElementById('voiceRecordBtn');
        const voiceStopBtn = document.getElementById('voiceStopBtn');
        
        if (voiceRecordBtn) voiceRecordBtn.style.display = 'inline-block';
        if (voiceStopBtn) voiceStopBtn.style.display = 'none';
        
        // Stop voice recognition if available
        if (window.voiceManager) {
            window.voiceManager.stop();
        }
    }

    // Setup debug buttons
    setupDebugButtons() {
        const debugButtons = [
            'forceRenderBtn',
            'syncTaskLoaderBtn',
            'reloadTasksBtn'
        ];
        
        debugButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleDebugButtonClick(btnId);
                });
            }
        });
    }

    // Handle debug button clicks
    handleDebugButtonClick(btnId) {
        switch (btnId) {
            case 'forceRenderBtn':
                console.log('Force Render button clicked');
                if (typeof window.forceRenderCurrentData === 'function') {
                    window.forceRenderCurrentData();
                }
                break;
            case 'syncTaskLoaderBtn':
                console.log('Syncing task loader data...');
                if (typeof window.taskLoader !== 'undefined' && window.taskLoader.syncTasks) {
                    window.taskLoader.syncTasks();
                    this.showToast('Task loader data synced successfully', 'success');
                } else {
                    this.showToast('Task loader not available', 'warning');
                }
                break;
            case 'reloadTasksBtn':
                console.log('Reloading tasks...');
                if (typeof window.reloadTasksForDebug === 'function') {
                    window.reloadTasksForDebug();
                    this.showToast('Tasks reloaded successfully', 'success');
                } else {
                    this.showToast('Reload function not available', 'warning');
                }
                break;
        }
    }

    // Initialize form fields
    initializeFormFields() {
        this.updateCurrentDateTime();
        this.setDefaultDueDate();
        this.updateInputMethodIndicator();
    }

    // Update current date time
    updateCurrentDateTime() {
        const currentDateTimeInput = document.getElementById('currentDateTime');
        if (currentDateTimeInput) {
            const now = new Date();
            const offset = now.getTimezoneOffset();
            const localDate = new Date(now.getTime() - (offset * 60 * 1000));
            currentDateTimeInput.value = localDate.toISOString().slice(0, 16);
        }
    }

    // Set default due date
    setDefaultDueDate() {
        const dueDateInput = document.getElementById('taskDueDate');
        if (dueDateInput) {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
            const offset = tomorrow.getTimezoneOffset();
            const localDate = new Date(tomorrow.getTime() - (offset * 60 * 1000));
            dueDateInput.value = localDate.toISOString().slice(0, 16);
        }
    }

    // Update input method indicator
    updateInputMethodIndicator() {
        const inputMethod = document.getElementById('taskInputMethod').value;
        const indicator = document.getElementById('inputMethodIndicator');
        
        if (indicator) {
            switch (inputMethod) {
                case 'voice':
                    indicator.innerHTML = '<i class="fas fa-microphone text-danger"></i> Voice';
                    break;
                case 'manual':
                    indicator.innerHTML = '<i class="fas fa-keyboard text-primary"></i> Manual';
                    break;
                default:
                    indicator.innerHTML = '<i class="fas fa-mouse text-secondary"></i> Auto';
            }
        }
    }

    // Set input method to voice
    setInputMethodToVoice() {
        const inputMethodSelect = document.getElementById('taskInputMethod');
        if (inputMethodSelect) {
            inputMethodSelect.value = 'voice';
            this.updateInputMethodIndicator();
        }
    }

    // Get recurrence data
    getRecurrenceData() {
        const recurring = document.getElementById('taskRecurring').value;
        if (recurring === 'true') {
            return {
                recurrence: {
                    type: document.getElementById('recurrenceType').value,
                    interval: parseInt(document.getElementById('recurrenceInterval').value) || 1,
                    timeString: document.getElementById('recurrenceTime').value,
                    nextOccurrence: this.calculateNextOccurrence(
                        document.getElementById('taskDueDate').value,
                        document.getElementById('recurrenceType').value,
                        document.getElementById('recurrenceTime').value
                    )
                }
            };
        }
        return {};
    }

    // Calculate next occurrence
    calculateNextOccurrence(dueDate, type, timeString) {
        if (!dueDate || !type) return null;
        
        const baseDate = new Date(dueDate);
        const now = new Date();
        
        // If base date is in the past, start from now
        const startDate = baseDate < now ? now : baseDate;
        
        let nextDate = new Date(startDate);
        
        switch (type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        
        // Apply time if specified
        if (timeString) {
            const [hours, minutes] = timeString.split(':');
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        
        return nextDate.toISOString();
    }

    // Setup voice UI
    setupVoiceUI() {
        // Voice UI specific setup
        const voiceSection = document.querySelector('.voice-section');
        if (voiceSection) {
            // Add any voice-specific UI enhancements
        }
    }

    // Setup debug UI
    setupDebugUI() {
        // Debug UI specific setup
        const debugSection = document.querySelector('.debug-section');
        if (debugSection) {
            // Add any debug-specific UI enhancements
        }
    }

    // Setup premium UI
    setupPremiumUI() {
        // Premium UI specific setup
        this.updatePremiumBannerDisplay();
    }

    // Update premium banner display
    updatePremiumBannerDisplay() {
        const premiumBanner = document.getElementById('premiumBanner');
        if (premiumBanner) {
            // Premium banner logic
        }
    }

    // Scroll to task history section
    scrollToTaskHistory() {
        const taskHistorySection = document.querySelector('.task-history');
        if (taskHistorySection) {
            taskHistorySection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            // Add a subtle highlight effect
            taskHistorySection.style.transition = 'box-shadow 0.3s ease';
            taskHistorySection.style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.3)';
            setTimeout(() => {
                taskHistorySection.style.boxShadow = '';
            }, 2000);
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${this.escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }

    // Escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update task stats
    updateTaskStats() {
        if (typeof window.updateTaskStats === 'function') {
            window.updateTaskStats();
        }
    }

    // Update dashboard stats
    updateDashboardStats() {
        if (typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }
    }

    // Render task grid
    renderTaskGrid() {
        if (typeof window.renderTaskGrid === 'function') {
            window.renderTaskGrid();
        } else {
            console.warn('renderTaskGrid function not found');
        }
    }

    // Update progress overview
    updateProgressOverview() {
        if (typeof window.updateProgressOverview === 'function') {
            window.updateProgressOverview();
        }
    }

    // Save tasks
    saveTasks() {
        if (typeof window.saveTasks === 'function') {
            window.saveTasks();
        }
    }
}

// Initialize Task UI Manager
const taskUI = new TaskUIManager();

// Export for global access
window.taskUI = taskUI;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    taskUI.init();
}); 