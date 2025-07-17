// task-fix.js - Fix for task loading issues

// Enhanced task loading function with proper error handling
async function loadUserTasks() {
    try {
        console.log('[Task Fix] Loading user tasks...');
        
        if (!firebase.auth().currentUser) {
            console.log('[Task Fix] No user authenticated');
            return [];
        }

        const userId = firebase.auth().currentUser.uid;
        console.log('[Task Fix] Loading tasks for user:', userId);

        // Try to load tasks from the user's personal task collection
        const tasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .doc(userId)
            .collection('userTasks')
            .orderBy('createdAt', 'desc')
            .get();

        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('[Task Fix] Loaded', tasks.length, 'personal tasks');

        // Also try to load team tasks if user is in a team
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.teamId) {
                    console.log('[Task Fix] User is in team:', userData.teamId);
                    
                    const teamTasksSnapshot = await firebase.firestore()
                        .collection('tasks')
                        .doc(userData.teamId)
                        .collection('teamTasks')
                        .where('assignedTo', '==', userId)
                        .orderBy('createdAt', 'desc')
                        .get();

                    teamTasksSnapshot.forEach(doc => {
                        tasks.push({
                            id: doc.id,
                            ...doc.data(),
                            isTeamTask: true
                        });
                    });

                    console.log('[Task Fix] Loaded', teamTasksSnapshot.size, 'team tasks');
                }
            }
        } catch (teamError) {
            console.warn('[Task Fix] Error loading team tasks:', teamError);
        }

        console.log('[Task Fix] Total tasks loaded:', tasks.length);
        return tasks;

    } catch (error) {
        console.error('[Task Fix] Error loading tasks:', error);
        
        // Fallback: try old collection structure
        try {
            console.log('[Task Fix] Trying fallback collection structure...');
            const fallbackSnapshot = await firebase.firestore()
                .collection('tasks')
                .where('userId', '==', firebase.auth().currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            const fallbackTasks = [];
            fallbackSnapshot.forEach(doc => {
                fallbackTasks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('[Task Fix] Fallback loaded', fallbackTasks.length, 'tasks');
            return fallbackTasks;

        } catch (fallbackError) {
            console.error('[Task Fix] Fallback also failed:', fallbackError);
            return [];
        }
    }
}

// Enhanced task saving function
async function saveTask(taskData) {
    try {
        console.log('[Task Fix] Saving task...');
        
        if (!firebase.auth().currentUser) {
            throw new Error('No user authenticated');
        }

        const userId = firebase.auth().currentUser.uid;
        const taskToSave = {
            ...taskData,
            userId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Save to user's personal task collection
        const taskRef = await firebase.firestore()
            .collection('tasks')
            .doc(userId)
            .collection('userTasks')
            .add(taskToSave);

        console.log('[Task Fix] Task saved with ID:', taskRef.id);
        return taskRef.id;

    } catch (error) {
        console.error('[Task Fix] Error saving task:', error);
        throw error;
    }
}

// Enhanced task updating function
async function updateTask(taskId, updates) {
    try {
        console.log('[Task Fix] Updating task:', taskId);
        
        if (!firebase.auth().currentUser) {
            throw new Error('No user authenticated');
        }

        const userId = firebase.auth().currentUser.uid;
        const updateData = {
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Try to update in user's personal task collection
        await firebase.firestore()
            .collection('tasks')
            .doc(userId)
            .collection('userTasks')
            .doc(taskId)
            .update(updateData);

        console.log('[Task Fix] Task updated successfully');

    } catch (error) {
        console.error('[Task Fix] Error updating task:', error);
        
        // Fallback: try old collection structure
        try {
            await firebase.firestore()
                .collection('tasks')
                .doc(taskId)
                .update(updateData);
            console.log('[Task Fix] Task updated via fallback');
        } catch (fallbackError) {
            console.error('[Task Fix] Fallback update failed:', fallbackError);
            throw error;
        }
    }
}

// Enhanced task deletion function
async function deleteTask(taskId) {
    try {
        console.log('[Task Fix] Deleting task:', taskId);
        
        if (!firebase.auth().currentUser) {
            throw new Error('No user authenticated');
        }

        const userId = firebase.auth().currentUser.uid;

        // Try to delete from user's personal task collection
        await firebase.firestore()
            .collection('tasks')
            .doc(userId)
            .collection('userTasks')
            .doc(taskId)
            .delete();

        console.log('[Task Fix] Task deleted successfully');

    } catch (error) {
        console.error('[Task Fix] Error deleting task:', error);
        
        // Fallback: try old collection structure
        try {
            await firebase.firestore()
                .collection('tasks')
                .doc(taskId)
                .delete();
            console.log('[Task Fix] Task deleted via fallback');
        } catch (fallbackError) {
            console.error('[Task Fix] Fallback deletion failed:', fallbackError);
            throw error;
        }
    }
}

// Function to migrate existing tasks to new structure
async function migrateTasks() {
    try {
        console.log('[Task Fix] Starting task migration...');
        
        if (!firebase.auth().currentUser) {
            throw new Error('No user authenticated');
        }

        const userId = firebase.auth().currentUser.uid;

        // Get all tasks from old structure
        const oldTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('userId', '==', userId)
            .get();

        console.log('[Task Fix] Found', oldTasksSnapshot.size, 'tasks to migrate');

        const migrationPromises = oldTasksSnapshot.docs.map(async (doc) => {
            const taskData = doc.data();
            
            // Save to new structure
            await firebase.firestore()
                .collection('tasks')
                .doc(userId)
                .collection('userTasks')
                .doc(doc.id)
                .set(taskData);

            // Delete from old structure
            await doc.ref.delete();
        });

        await Promise.all(migrationPromises);
        console.log('[Task Fix] Migration completed successfully');

    } catch (error) {
        console.error('[Task Fix] Migration failed:', error);
        throw error;
    }
}

// Function to initialize task collection structure
async function initializeTaskStructure() {
    try {
        console.log('[Task Fix] Initializing task structure...');
        
        if (!firebase.auth().currentUser) {
            throw new Error('No user authenticated');
        }

        const userId = firebase.auth().currentUser.uid;

        // Create user's task collection if it doesn't exist
        await firebase.firestore()
            .collection('tasks')
            .doc(userId)
            .set({
                userId: userId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        console.log('[Task Fix] Task structure initialized');

    } catch (error) {
        console.error('[Task Fix] Initialization failed:', error);
        throw error;
    }
}

// Export functions for use in other files
window.taskFix = {
    loadUserTasks,
    saveTask,
    updateTask,
    deleteTask,
    migrateTasks,
    initializeTaskStructure
};

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Task Fix] Task fix script loaded');
    
    // Initialize task structure when user is authenticated
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                await initializeTaskStructure();
            } catch (error) {
                console.warn('[Task Fix] Auto-initialization failed:', error);
            }
        }
    });
}); 