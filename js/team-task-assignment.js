// Team Task Assignment Module for Premium Admin Users
// Handles team selection, member assignment, and Firestore storage

class TeamTaskAssignment {
    constructor() {
        this.currentUser = null;
        this.userRole = 'free';
        this.userTeams = [];
        this.selectedTeam = null;
        this.teamMembers = [];
        this.isAdmin = false;
        this.init();
    }

    async init() {
        console.log('[TeamTask] Initializing Team Task Assignment...');
        
        // Wait for Firebase to be ready
        if (window.firebaseAuth) {
            this.setupAuthListener();
        } else {
            const checkInterval = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkInterval);
                    this.setupAuthListener();
                }
            }, 1000);
        }
    }

    setupAuthListener() {
        console.log('[TeamTask] Setting up auth listener...');
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkUserRole();
            } else {
                this.currentUser = null;
                this.hideTeamAssignmentUI();
            }
        });
    }

    async checkUserRole() {
        try {
            console.log('[TeamTask] Checking user role...');
            
            if (!window.firebaseDb) {
                console.error('[TeamTask] Firestore not initialized');
                return;
            }

            const userDoc = await window.firebaseDb
                .collection('users')
                .doc(this.currentUser.uid)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userRole = userData.role || 'free';
                console.log('[TeamTask] User role:', this.userRole);

                if (this.userRole === 'premium') {
                    await this.checkAdminStatus();
                } else {
                    this.hideTeamAssignmentUI();
                }
            } else {
                this.hideTeamAssignmentUI();
            }
        } catch (error) {
            console.error('[TeamTask] Error checking user role:', error);
            this.hideTeamAssignmentUI();
        }
    }

    async checkAdminStatus() {
        try {
            console.log('[TeamTask] Checking admin status...');
            
            // Check if user is admin of any teams
            const teamsSnapshot = await window.firebaseDb
                .collection('teams')
                .where('createdBy', '==', this.currentUser.uid)
                .get();

            if (!teamsSnapshot.empty) {
                this.isAdmin = true;
                this.userTeams = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('[TeamTask] User is admin of teams:', this.userTeams.length);
                this.showTeamAssignmentUI();
                this.populateTeamDropdown();
            } else {
                this.isAdmin = false;
                this.hideTeamAssignmentUI();
            }
        } catch (error) {
            console.error('[TeamTask] Error checking admin status:', error);
            this.hideTeamAssignmentUI();
        }
    }

    showTeamAssignmentUI() {
        console.log('[TeamTask] Showing team assignment UI...');
        
        // Create team assignment section if it doesn't exist
        this.createTeamAssignmentSection();
        
        // Show the section
        const teamSection = document.getElementById('teamAssignmentSection');
        if (teamSection) {
            teamSection.style.display = 'block';
            teamSection.classList.remove('d-none');
        }
    }

    hideTeamAssignmentUI() {
        console.log('[TeamTask] Hiding team assignment UI...');
        
        const teamSection = document.getElementById('teamAssignmentSection');
        if (teamSection) {
            teamSection.style.display = 'none';
            teamSection.classList.add('d-none');
        }
    }

    createTeamAssignmentSection() {
        // Check if section already exists
        if (document.getElementById('teamAssignmentSection')) {
            return;
        }

        console.log('[TeamTask] Creating team assignment section...');
        
        // Find the task form container
        const taskForm = document.getElementById('taskForm');
        if (!taskForm) {
            console.error('[TeamTask] Task form not found');
            return;
        }

        // Create team assignment section
        const teamSection = document.createElement('div');
        teamSection.id = 'teamAssignmentSection';
        teamSection.className = 'card mb-4';
        teamSection.style.display = 'none';
        
        teamSection.innerHTML = `
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                    <i class="fas fa-users me-2"></i>Team Task Assignment
                </h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="teamSelect" class="form-label">
                                <i class="fas fa-layer-group me-1"></i>Assign to Team
                            </label>
                            <select class="form-select" id="teamSelect" name="teamId">
                                <option value="">Select a team...</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="memberSelect" class="form-label">
                                <i class="fas fa-user me-1"></i>Assign to Member
                            </label>
                            <select class="form-select" id="memberSelect" name="assignedTo" disabled>
                                <option value="">Select a team first...</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Team Task:</strong> This task will be visible to the entire team and assigned to the selected member.
                        </div>
                    </div>
                </div>
                <input type="hidden" id="taskType" name="taskType" value="individual">
            </div>
        `;

        // Insert before the task form
        taskForm.parentNode.insertBefore(teamSection, taskForm);

        // Setup event listeners
        this.setupTeamAssignmentListeners();
    }

    setupTeamAssignmentListeners() {
        const teamSelect = document.getElementById('teamSelect');
        const memberSelect = document.getElementById('memberSelect');
        const taskTypeInput = document.getElementById('taskType');

        if (teamSelect) {
            teamSelect.addEventListener('change', (e) => {
                this.onTeamChange(e.target.value);
            });
        }

        if (memberSelect) {
            memberSelect.addEventListener('change', (e) => {
                this.onMemberChange(e.target.value);
            });
        }
    }

    populateTeamDropdown() {
        const teamSelect = document.getElementById('teamSelect');
        if (!teamSelect) return;

        // Clear existing options
        teamSelect.innerHTML = '<option value="">Select a team...</option>';

        // Add team options
        this.userTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });

        console.log('[TeamTask] Populated team dropdown with', this.userTeams.length, 'teams');
    }

    async onTeamChange(teamId) {
        console.log('[TeamTask] Team selected:', teamId);
        
        const memberSelect = document.getElementById('memberSelect');
        const taskTypeInput = document.getElementById('taskType');

        if (!teamId) {
            // No team selected
            memberSelect.innerHTML = '<option value="">Select a team first...</option>';
            memberSelect.disabled = true;
            taskTypeInput.value = 'individual';
            this.selectedTeam = null;
            this.teamMembers = [];
            return;
        }

        // Team selected
        this.selectedTeam = this.userTeams.find(team => team.id === teamId);
        taskTypeInput.value = 'team';

        // Fetch team members
        await this.fetchTeamMembers(teamId);
    }

    async fetchTeamMembers(teamId) {
        try {
            console.log('[TeamTask] Fetching team members for team:', teamId);
            
            const memberSelect = document.getElementById('memberSelect');
            memberSelect.innerHTML = '<option value="">Loading members...</option>';
            memberSelect.disabled = true;

            // Get team members from Firestore
            const teamDoc = await window.firebaseDb
                .collection('teams')
                .doc(teamId)
                .get();

            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                const memberIds = teamData.members || [];

                // Fetch member details
                const memberPromises = memberIds.map(async (memberId) => {
                    try {
                        const userDoc = await window.firebaseDb
                            .collection('users')
                            .doc(memberId)
                            .get();
                        
                        if (userDoc.exists) {
                            return {
                                id: memberId,
                                ...userDoc.data()
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error('[TeamTask] Error fetching member:', memberId, error);
                        return null;
                    }
                });

                const members = (await Promise.all(memberPromises)).filter(member => member !== null);
                this.teamMembers = members;

                // Populate member dropdown
                memberSelect.innerHTML = '<option value="">Select a member...</option>';
                members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.name || member.email;
                    memberSelect.appendChild(option);
                });

                memberSelect.disabled = false;
                console.log('[TeamTask] Loaded', members.length, 'team members');
            }
        } catch (error) {
            console.error('[TeamTask] Error fetching team members:', error);
            const memberSelect = document.getElementById('memberSelect');
            memberSelect.innerHTML = '<option value="">Error loading members</option>';
            memberSelect.disabled = true;
        }
    }

    onMemberChange(memberId) {
        console.log('[TeamTask] Member selected:', memberId);
        
        // Update task type based on selection
        const taskTypeInput = document.getElementById('taskType');
        if (memberId) {
            taskTypeInput.value = 'team';
        } else {
            taskTypeInput.value = 'individual';
        }
    }

    // Method to save team task
    async saveTeamTask(taskData) {
        try {
            console.log('[TeamTask] Saving team task:', taskData);
            
            const teamId = taskData.teamId;
            const assignedTo = taskData.assignedTo;
            
            if (!teamId || !assignedTo) {
                throw new Error('Team ID and assigned member are required for team tasks');
            }

            // 1. Save task to team collection
            const teamTaskRef = await window.firebaseDb
                .collection('tasks')
                .doc(teamId)
                .collection('teamTasks')
                .add({
                    ...taskData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    taskType: 'team'
                });

            // 2. Add reference to assigned user's assigned tasks
            await window.firebaseDb
                .collection('users')
                .doc(assignedTo)
                .collection('assignedTasks')
                .doc(teamTaskRef.id)
                .set({
                    taskId: teamTaskRef.id,
                    teamId: teamId,
                    title: taskData.title,
                    status: taskData.status,
                    dueDate: taskData.dueDate,
                    assignedAt: new Date().toISOString(),
                    createdBy: this.currentUser.uid
                });

            console.log('[TeamTask] Team task saved successfully:', teamTaskRef.id);
            return teamTaskRef.id;

        } catch (error) {
            console.error('[TeamTask] Error saving team task:', error);
            throw error;
        }
    }

    // Method to get team tasks for display
    async getTeamTasks() {
        try {
            const teamTasks = [];
            
            // Get tasks from all teams where user is admin
            for (const team of this.userTeams) {
                const tasksSnapshot = await window.firebaseDb
                    .collection('tasks')
                    .doc(team.id)
                    .collection('teamTasks')
                    .get();

                tasksSnapshot.docs.forEach(doc => {
                    teamTasks.push({
                        id: doc.id,
                        teamId: team.id,
                        teamName: team.name,
                        ...doc.data()
                    });
                });
            }

            return teamTasks;
        } catch (error) {
            console.error('[TeamTask] Error fetching team tasks:', error);
            return [];
        }
    }

    // Method to format team task for display
    formatTeamTaskForDisplay(task) {
        const assignedMember = this.teamMembers.find(member => member.id === task.assignedTo);
        const memberName = assignedMember ? (assignedMember.name || assignedMember.email) : 'Unknown';
        
        return {
            ...task,
            displayInfo: `Team Task: ${task.teamName} - Assigned to ${memberName}`,
            isTeamTask: true
        };
    }

    // Public method to check if user can assign team tasks
    canAssignTeamTasks() {
        return this.userRole === 'premium' && this.isAdmin && this.userTeams.length > 0;
    }

    // Public method to get current status
    getStatus() {
        return {
            userRole: this.userRole,
            isAdmin: this.isAdmin,
            teamsCount: this.userTeams.length,
            selectedTeam: this.selectedTeam,
            teamMembersCount: this.teamMembers.length
        };
    }
}

// Initialize Team Task Assignment
const teamTaskAssignment = new TeamTaskAssignment();

// Make it globally available
window.teamTaskAssignment = teamTaskAssignment;

console.log('[TeamTask] Team Task Assignment module loaded'); 