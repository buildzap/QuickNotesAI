// Team Task Management JavaScript

// Global variables for team task functionality
// Use existing currentUser from window object
let userTeams = [];
let currentTeamMembers = [];
window.isPremiumUser = false;
let isTeamAdmin = false;

// Initialize team task functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeTeamTaskFunctionality();
});

// Initialize team task functionality
async function initializeTeamTaskFunctionality() {
    try {
        // Check if user is authenticated
        firebase.auth().onAuthStateChanged(async function(user) {
            if (user) {
                window.currentUser = user;
                
                // Check premium status
                await checkPremiumStatus();
                
                if (window.isPremiumUser) {
                    // Load user's teams
                    await loadUserTeams();
                    
                    // Set up team assignment event listeners
                    setupTeamAssignmentListeners();
                    
                    // Show team assignment section for premium users
                    showTeamAssignmentSection();
                }
                
            } else {
                console.log('User not authenticated for team functionality');
            }
        });
        
    } catch (error) {
        console.error('Error initializing team task functionality:', error);
    }
}

// Check premium status
async function checkPremiumStatus() {
    try {
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(window.currentUser.uid)
            .get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            window.isPremiumUser = userData.premium || userData.role === 'premium';
            isTeamAdmin = userData.isAdmin || false;
        }
        
    } catch (error) {
        console.error('Error checking premium status:', error);
    }
}

// Load user's teams
async function loadUserTeams() {
    try {
        const teamsSnapshot = await firebase.firestore()
            .collection('teams')
            .where('members', 'array-contains', window.currentUser.uid)
            .get();
        
        userTeams = [];
        teamsSnapshot.forEach(doc => {
            userTeams.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        populateTeamSelect();
        
    } catch (error) {
        console.error('Error loading user teams:', error);
    }
}

// Populate team select dropdown
function populateTeamSelect() {
    const teamSelect = document.getElementById('teamSelect');
    if (!teamSelect) return;
    
    // Clear existing options except the first one
    teamSelect.innerHTML = '<option value="">Choose a team...</option>';
    
    userTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
    });
}

// Load team members for selected team
async function loadTeamMembers(teamId) {
    try {
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .get();
        
        if (teamDoc.exists) {
            const teamData = teamDoc.data();
            const memberIds = teamData.members || [];
            
            currentTeamMembers = [];
            
            // Load member details
            for (const memberId of memberIds) {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(memberId)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    currentTeamMembers.push({
                        id: memberId,
                        name: userData.displayName || userData.email,
                        email: userData.email
                    });
                }
            }
            
            populateMemberSelect();
        }
        
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

// Populate member select dropdown
function populateMemberSelect() {
    const memberSelect = document.getElementById('memberSelect');
    if (!memberSelect) return;
    
    // Clear existing options except the first one
    memberSelect.innerHTML = '<option value="">Choose a team member...</option>';
    
    currentTeamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
    });
}

// Setup team assignment event listeners
function setupTeamAssignmentListeners() {
    // Team assignment checkbox
    const assignToTeamCheckbox = document.getElementById('assignToTeam');
    if (assignToTeamCheckbox) {
        assignToTeamCheckbox.addEventListener('change', function() {
            const teamAssignmentOptions = document.getElementById('teamAssignmentOptions');
            const taskTypeInput = document.getElementById('taskType');
            
            if (this.checked) {
                teamAssignmentOptions.style.display = 'block';
                taskTypeInput.value = 'team';
            } else {
                teamAssignmentOptions.style.display = 'none';
                taskTypeInput.value = 'individual';
                // Clear team and member selections
                document.getElementById('teamSelect').value = '';
                document.getElementById('memberSelect').value = '';
                document.getElementById('taskTeamId').value = '';
                document.getElementById('taskAssignedTo').value = '';
            }
        });
    }
    
    // Team select change
    const teamSelect = document.getElementById('teamSelect');
    if (teamSelect) {
        teamSelect.addEventListener('change', function() {
            const memberSelect = document.getElementById('memberSelect');
            const taskTeamIdInput = document.getElementById('taskTeamId');
            
            if (this.value) {
                taskTeamIdInput.value = this.value;
                loadTeamMembers(this.value);
            } else {
                memberSelect.innerHTML = '<option value="">Choose a team member...</option>';
                taskTeamIdInput.value = '';
                document.getElementById('taskAssignedTo').value = '';
            }
        });
    }
    
    // Member select change
    const memberSelect = document.getElementById('memberSelect');
    if (memberSelect) {
        memberSelect.addEventListener('change', function() {
            const taskAssignedToInput = document.getElementById('taskAssignedTo');
            taskAssignedToInput.value = this.value;
        });
    }
}

// Show team assignment section for premium users
function showTeamAssignmentSection() {
    const teamAssignmentSection = document.getElementById('teamAssignmentSection');
    if (teamAssignmentSection && window.isPremiumUser) {
        teamAssignmentSection.classList.remove('d-none');
    }
}

// Enhanced addTask function to handle team tasks
async function addTeamTask(taskData) {
    try {
        const taskType = document.getElementById('taskType').value;
        
        if (taskType === 'team') {
            const teamId = document.getElementById('taskTeamId').value;
            const assignedTo = document.getElementById('taskAssignedTo').value;
            
            if (!teamId) {
                throw new Error('Please select a team for team tasks');
            }
            
            if (!assignedTo) {
                throw new Error('Please assign the task to a team member');
            }
            
            // Add team-specific fields
            taskData.teamId = teamId;
            taskData.assignedTo = assignedTo;
            taskData.taskType = 'team';
            taskData.createdBy = currentUser.uid;
            
            // Save to team tasks collection
            const teamTaskRef = await firebase.firestore()
                .collection('tasks')
                .doc(teamId)
                .collection('teamTasks')
                .add({
                    ...taskData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Also add pointer to assigned user's tasks
            await firebase.firestore()
                .collection('users')
                .doc(assignedTo)
                .collection('assignedTasks')
                .doc(teamTaskRef.id)
                .set({
                    taskId: teamTaskRef.id,
                    teamId: teamId,
                    title: taskData.title,
                    status: taskData.status,
                    priority: taskData.priority,
                    dueDate: taskData.dueDate,
                    assignedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return teamTaskRef.id;
            
        } else {
            // Handle individual tasks (existing logic)
            return await addIndividualTask(taskData);
        }
        
    } catch (error) {
        console.error('Error adding team task:', error);
        throw error;
    }
}

// Add individual task (existing functionality)
async function addIndividualTask(taskData) {
    try {
        taskData.taskType = 'individual';
        taskData.createdBy = currentUser.uid;
        
        const taskRef = await firebase.firestore()
            .collection('tasks')
            .doc(currentUser.uid)
            .collection('userTasks')
            .add({
                ...taskData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        return taskRef.id;
        
    } catch (error) {
        console.error('Error adding individual task:', error);
        throw error;
    }
}

// Enhanced loadTasks function to handle both individual and team tasks
async function loadAllTasks() {
    try {
        const tasks = [];
        
        // Load individual tasks
        const individualTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .doc(currentUser.uid)
            .collection('userTasks')
            .orderBy('createdAt', 'desc')
            .get();
        
        individualTasksSnapshot.forEach(doc => {
            tasks.push({
                id: doc.id,
                ...doc.data(),
                taskType: 'individual'
            });
        });
        
        // Load team tasks where user is a member
        for (const team of userTeams) {
            const teamTasksSnapshot = await firebase.firestore()
                .collection('tasks')
                .doc(team.id)
                .collection('teamTasks')
                .orderBy('createdAt', 'desc')
                .get();
            
            teamTasksSnapshot.forEach(doc => {
                tasks.push({
                    id: doc.id,
                    ...doc.data(),
                    taskType: 'team',
                    teamName: team.name
                });
            });
        }
        
        // Load assigned tasks
        const assignedTasksSnapshot = await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('assignedTasks')
            .orderBy('assignedAt', 'desc')
            .get();
        
        assignedTasksSnapshot.forEach(doc => {
            const assignedTask = doc.data();
            // Check if this task is already in the list
            const existingTask = tasks.find(t => t.id === assignedTask.taskId);
            if (!existingTask) {
                tasks.push({
                    id: assignedTask.taskId,
                    ...assignedTask,
                    taskType: 'assigned'
                });
            }
        });
        
        return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
    } catch (error) {
        console.error('Error loading all tasks:', error);
        return [];
    }
}

// Enhanced filter function to handle team tasks
function filterTasksByType(tasks, taskTypeFilter) {
    if (!taskTypeFilter) return tasks;
    
    return tasks.filter(task => {
        if (taskTypeFilter === 'individual') {
            return task.taskType === 'individual';
        } else if (taskTypeFilter === 'team') {
            return task.taskType === 'team' || task.taskType === 'assigned';
        }
        return true;
    });
}

// Get team member name by ID
function getTeamMemberName(memberId) {
    const member = currentTeamMembers.find(m => m.id === memberId);
    return member ? member.name : 'Unknown Member';
}

// Get team name by ID
function getTeamName(teamId) {
    const team = userTeams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
}

// Export functions for use in other scripts
window.teamTaskFunctions = {
    initializeTeamTaskFunctionality,
    addTeamTask,
    loadAllTasks,
    filterTasksByType,
    getTeamMemberName,
    getTeamName,
    showTeamAssignmentSection
}; 