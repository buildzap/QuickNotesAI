// Team Dashboard Analytics JavaScript

// Team Dashboard Namespace
if (typeof window.TeamDashboard === 'undefined') {
    window.TeamDashboard = {
        currentUser: window.currentUser || null,
        currentTeam: null,
        teamTasks: [],
        teamMembers: [],
        teamCharts: {},
        isPremiumUser: false,
        // Pagination variables
        currentPage: 1,
        tasksPerPage: 8,
        // Filter variables
        filteredTasks: [],
        activeFilters: {
            team: '',
            status: '',
            priority: '',
            member: ''
        },
        // Admin teams
        adminTeams: [],
        // User role and permissions
        isTeamAdmin: false,
        currentTeamOwner: null,
        selectedTeamId: null
    };
}

// Helper function to get current values from namespace
function getCurrentUser() { return window.TeamDashboard.currentUser; }
function getCurrentTeam() { return window.TeamDashboard.currentTeam; }
function getTeamTasks() { return window.TeamDashboard.teamTasks; }
function getTeamMembers() { return window.TeamDashboard.teamMembers; }
function getTeamCharts() { return window.TeamDashboard.teamCharts; }
function getIsPremiumUser() { return window.TeamDashboard.isPremiumUser; }

// Helper function to set values in namespace
function setCurrentUser(user) { window.TeamDashboard.currentUser = user; }
function setCurrentTeam(team) { window.TeamDashboard.currentTeam = team; }
function setTeamTasks(tasks) { 
    window.TeamDashboard.teamTasks = tasks || [];
    console.log('Team tasks set:', tasks?.length || 0, 'tasks');
    
    // Update filtered tasks
    setFilteredTasks(getTeamTasks());
    
    // Update display
    updateTeamTasksDisplay();
    
    // Populate member filter only if the element exists
    const memberFilterElement = document.getElementById('memberFilter');
    if (memberFilterElement) {
        populateMemberFilter();
    }
}
function setTeamMembers(members) { window.TeamDashboard.teamMembers = members; }
function setTeamCharts(charts) { window.TeamDashboard.teamCharts = charts; }
function setIsPremiumUser(premium) { window.TeamDashboard.isPremiumUser = premium; }

// Pagination helper functions
function getCurrentPage() { return window.TeamDashboard.currentPage; }
function getTasksPerPage() { return window.TeamDashboard.tasksPerPage; }
function setCurrentPage(page) { window.TeamDashboard.currentPage = page; }
function resetPagination() { window.TeamDashboard.currentPage = 1; }

// Filter helper functions
function getFilteredTasks() { return window.TeamDashboard.filteredTasks; }
function setFilteredTasks(tasks) { window.TeamDashboard.filteredTasks = tasks; }
function getActiveFilters() { return window.TeamDashboard.activeFilters; }
function setActiveFilters(filters) { window.TeamDashboard.activeFilters = filters; }
function resetFilters() { 
    window.TeamDashboard.activeFilters = { team: '', status: '', priority: '', member: '' };
    window.TeamDashboard.filteredTasks = [];
}

// Admin teams helper functions
function getAdminTeams() { return window.TeamDashboard.adminTeams; }
function setAdminTeams(teams) { window.TeamDashboard.adminTeams = teams; }

// User role and permissions helper functions
function getIsTeamAdmin() { return window.TeamDashboard.isTeamAdmin; }
function setIsTeamAdmin(isAdmin) { window.TeamDashboard.isTeamAdmin = isAdmin; }
function getCurrentTeamOwner() { return window.TeamDashboard.currentTeamOwner; }
function setCurrentTeamOwner(owner) { window.TeamDashboard.currentTeamOwner = owner; }
function getSelectedTeamId() { return window.TeamDashboard.selectedTeamId; }
function setSelectedTeamId(teamId) { window.TeamDashboard.selectedTeamId = teamId; }

// Helper function to get current team name
async function getCurrentTeamName() {
    const currentTeamId = getCurrentTeam();
    if (!currentTeamId) return 'Unknown Team';
    
    try {
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(currentTeamId)
            .get();
        
        if (teamDoc.exists) {
            return teamDoc.data().name || 'Unknown Team';
        }
    } catch (error) {
        console.error('Error getting team name:', error);
    }
    
    return 'Unknown Team';
}

// Initialize team dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing team dashboard...');
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded. Please ensure firebase-config.js is included.');
        showAlert('Firebase is not loaded. Please refresh the page.', 'danger');
        return;
    }
    
    // Initialize the dashboard
    initializeTeamDashboard();
    
    // Add global refresh button functionality
    const refreshButton = document.getElementById('refreshTeamDashboard');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            console.log('Refresh button clicked');
            await manualRefresh();
        });
    }
    
    // Add global debug button functionality
    const debugButton = document.getElementById('debugTeamDashboard');
    if (debugButton) {
        debugButton.addEventListener('click', () => {
            console.log('Debug button clicked');
            debugTeamInfo();
        });
    }
});

// Initialize team dashboard functionality
async function initializeTeamDashboard() {
    try {
        console.log('Initializing team dashboard...');
        
        // Check if user is authenticated
        firebase.auth().onAuthStateChanged(async function(user) {
            if (user) {
                console.log('User authenticated:', user.email);
                setCurrentUser(user);
                
                // Check premium status
                await checkPremiumStatus();
                
                // Load admin teams first
                await loadAdminTeams();
                
                // Always try to get or create a team, regardless of premium status
                console.log('Loading team data...');
                
                // Get team ID from URL or user profile
                await fetchCurrentTeam();
                
                if (getCurrentTeam()) {
                    console.log('Current team found:', getCurrentTeam());
                    
                    // Load team data with retry mechanism
                    let retryCount = 0;
                    const maxRetries = 3;
                    
                    while (retryCount < maxRetries) {
                        try {
                            await loadTeamData();
                            break; // Success, exit retry loop
                        } catch (error) {
                            retryCount++;
                            console.warn(`Team data load attempt ${retryCount} failed:`, error);
                            
                            if (retryCount >= maxRetries) {
                                console.error('Max retries reached for loading team data');
                                showAlert('Failed to load team data after multiple attempts. Please refresh the page.', 'danger');
                                showNoTeamMessage();
                                return;
                            }
                            
                            // Wait before retrying
                            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        }
                    }
                    
                    // Initialize charts
                    initializeCharts();
                    
                    // Set up real-time listeners
                    setupRealtimeListeners();
                    
                    // Update dashboard
                    updateDashboard();
                    
                    // Show team info section and hide loading spinner
                    showTeamDashboard();
                } else {
                    console.log('No team found, creating default team...');
                    await createDefaultTeam();
                    
                    if (getCurrentTeam()) {
                        await loadTeamData();
                        initializeCharts();
                        setupRealtimeListeners();
                        updateDashboard();
                        showTeamDashboard();
                    } else {
                        showNoTeamMessage();
                    }
                }
                
            } else {
                console.log('No user authenticated');
                showLoginRequiredMessage();
            }
        });
        
    } catch (error) {
        console.error('Error initializing team dashboard:', error);
        showAlert('Error initializing team dashboard. Please refresh and try again.', 'danger');
    }
}

// Create sample team tasks if no team tasks exist
async function createSampleTeamTasksIfNeeded() {
    try {
        console.log('Checking if sample team tasks need to be created...');
        
        // Check if we already have team tasks
        if (getTeamTasks().length > 0) {
            console.log('Team tasks already exist, skipping sample creation');
            return;
        }
        
        console.log('No team tasks found, creating sample team tasks...');
        
        const currentTeamId = getCurrentTeam();
        const currentUserId = getCurrentUser().uid;
        
        console.log('Creating sample tasks for team:', currentTeamId, 'by user:', currentUserId);
        
        const sampleTasks = [
            {
                title: 'Design System Implementation',
                description: 'Create and implement a comprehensive design system for the new product features',
                priority: 'high',
                status: 'in-progress',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                assignedTo: 'sarah.designer@team.com',
                teamAssignment: {
                    assignedToTeam: true,
                                    teamId: getCurrentTeam(),
                teamName: 'Code Ninja Team',
                memberId: 'sarah.designer@team.com',
                memberName: 'Sarah Designer',
                assignedAt: new Date().toISOString(),
                assignedBy: getCurrentUser().uid
                }
            },
            {
                title: 'API Documentation Review',
                description: 'Review and update API documentation for the new endpoints',
                priority: 'medium',
                status: 'pending',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                assignedTo: 'mike.developer@team.com',
                teamAssignment: {
                    assignedToTeam: true,
                                    teamId: getCurrentTeam(),
                teamName: 'Code Ninja Team',
                memberId: 'mike.developer@team.com',
                memberName: 'Mike Developer',
                assignedAt: new Date().toISOString(),
                assignedBy: getCurrentUser().uid
                }
            },
            {
                title: 'User Testing Session',
                description: 'Conduct user testing sessions for the beta version of the application',
                priority: 'high',
                status: 'completed',
                dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                assignedTo: 'emma.qa@team.com',
                teamAssignment: {
                    assignedToTeam: true,
                                    teamId: getCurrentTeam(),
                teamName: 'Code Ninja Team',
                memberId: 'emma.qa@team.com',
                memberName: 'Emma QA',
                assignedAt: new Date().toISOString(),
                assignedBy: getCurrentUser().uid
                }
            },
            {
                title: 'Performance Optimization',
                description: 'Optimize database queries and improve application performance',
                priority: 'medium',
                status: 'in-progress',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                assignedTo: 'alex.backend@team.com',
                teamAssignment: {
                    assignedToTeam: true,
                                    teamId: getCurrentTeam(),
                teamName: 'Code Ninja Team',
                memberId: 'alex.backend@team.com',
                memberName: 'Alex Backend',
                assignedAt: new Date().toISOString(),
                assignedBy: getCurrentUser().uid
                }
            },
            {
                title: 'Marketing Campaign Planning',
                description: 'Plan and prepare marketing materials for the product launch',
                priority: 'low',
                status: 'pending',
                dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
                assignedTo: 'lisa.marketing@team.com',
                teamAssignment: {
                    assignedToTeam: true,
                                    teamId: getCurrentTeam(),
                teamName: 'Code Ninja Team',
                memberId: 'lisa.marketing@team.com',
                memberName: 'Lisa Marketing',
                assignedAt: new Date().toISOString(),
                assignedBy: getCurrentUser().uid
                }
            }
        ];
        
        // Add sample tasks to Firestore
        for (const taskData of sampleTasks) {
            const taskDoc = {
                ...taskData,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: getCurrentUser().uid,
                taskType: 'team',
                teamId: currentTeamId,
                teamName: 'Code Ninja Team'
            };
            
            console.log('Creating task document:', taskDoc);
            
            const docRef = await firebase.firestore()
                .collection('tasks')
                .add(taskDoc);
            
            console.log('Sample team task created with ID:', docRef.id, 'Title:', taskData.title);
        }
        
        console.log('Sample team tasks created successfully!');
        
        // Reload team tasks after creating samples
        await loadTeamTasks();
        
    } catch (error) {
        console.error('Error creating sample team tasks:', error);
    }
}

// Check premium status
async function checkPremiumStatus() {
    try {
        const currentUser = getCurrentUser();
        console.log('Checking premium status for user:', currentUser.uid);
        
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('User data for premium check:', userData);
            
            // Check multiple possible premium fields
            let isPremiumUser = userData.premium || userData.isPremium || userData.role === 'premium' || false;
            
            // For development/testing, allow all users to access team features
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Development mode detected, allowing team access');
                isPremiumUser = true;
            }
            
            // Also check if user has any team-related data
            if (userData.teamId || userData.isTeamAdmin || userData.isTeamMember) {
                console.log('User has team data, allowing access');
                isPremiumUser = true;
            }
            
            setIsPremiumUser(isPremiumUser);
        } else {
            console.log('User document not found, creating user document...');
            // Create user document if it doesn't exist
            await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .set({
                    email: currentUser.email,
                    displayName: currentUser.displayName || currentUser.email,
                    createdAt: new Date(),
                    premium: true, // Set as premium for testing
                    isPremium: true
                });
            setIsPremiumUser(true);
        }
        
        console.log('Premium status:', getIsPremiumUser());
        
    } catch (error) {
        console.error('Error checking premium status:', error);
        // For development, default to premium
        setIsPremiumUser(true);
    }
}

// Get current team from URL or user profile
async function fetchCurrentTeam() {
    try {
        console.log('Getting current team for user:', getCurrentUser().uid);
        
        // Check URL for team ID
        const urlParams = new URLSearchParams(window.location.search);
        const teamIdFromUrl = urlParams.get('teamId');
        
        if (teamIdFromUrl) {
            console.log('Team ID found in URL:', teamIdFromUrl);
            
            // Verify the team exists and user has access
            try {
                const teamDoc = await firebase.firestore()
                    .collection('teams')
                    .doc(teamIdFromUrl)
                    .get();
                
                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    // Check if user is a member of this team
                    if (teamData.members && teamData.members.includes(getCurrentUser().uid)) {
                        console.log('User has access to team from URL');
                        setCurrentTeam(teamIdFromUrl);
                        return;
                    } else {
                        console.log('User does not have access to team from URL');
                    }
                } else {
                    console.log('Team from URL does not exist');
                }
            } catch (teamError) {
                console.error('Error verifying team from URL:', teamError);
            }
        }
        
        // Get from user profile
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(getCurrentUser().uid)
                .get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('User data:', userData);
                
                if (userData.teamId) {
                    console.log('Team ID found in user profile:', userData.teamId);
                    
                    // Verify the team exists
                    try {
                        const teamDoc = await firebase.firestore()
                            .collection('teams')
                            .doc(userData.teamId)
                            .get();
                        
                        if (teamDoc.exists) {
                            setCurrentTeam(userData.teamId);
                            return;
                        } else {
                            console.log('Team from user profile does not exist');
                        }
                    } catch (teamError) {
                        console.error('Error verifying team from user profile:', teamError);
                    }
                }
                
                // Check if user is a member of any team
                try {
                    const teamMembershipQuery = await firebase.firestore()
                        .collection('teamMembers')
                        .where('memberId', '==', getCurrentUser().uid)
                        .limit(1)
                        .get();
                    
                    if (!teamMembershipQuery.empty) {
                        const membership = teamMembershipQuery.docs[0].data();
                        console.log('Team membership found:', membership);
                        
                        // Verify the team exists
                        const teamDoc = await firebase.firestore()
                            .collection('teams')
                            .doc(membership.teamId)
                            .get();
                        
                        if (teamDoc.exists) {
                            setCurrentTeam(membership.teamId);
                            return;
                        }
                    }
                } catch (membershipError) {
                    console.error('Error checking team membership:', membershipError);
                }
            }
        } catch (userError) {
            console.error('Error getting user data:', userError);
        }
        
        // If no team found, create a default team
        console.log('No team found, creating default team...');
        await createDefaultTeam();
        
    } catch (error) {
        console.error('Error getting current team:', error);
        // Create default team as fallback
        await createDefaultTeam();
    }
}

// Load all teams where the user is an admin
async function loadAdminTeams() {
    try {
        console.log('Loading admin teams for user:', getCurrentUser().uid);
        
        // Query teams where user is the creator (admin)
        const teamsQuery = await firebase.firestore()
            .collection('teams')
            .where('createdBy', '==', getCurrentUser().uid)
            .get();
        
        const adminTeams = [];
        
        for (const doc of teamsQuery.docs) {
            const teamData = doc.data();
            adminTeams.push({
                id: doc.id,
                name: teamData.name,
                description: teamData.description,
                createdAt: teamData.createdAt,
                memberCount: teamData.members ? teamData.members.length : 0,
                isDefault: teamData.isDefault || false
            });
        }
        
        // Also check teamMembers collection for admin roles
        const teamMembersQuery = await firebase.firestore()
            .collection('teamMembers')
            .where('memberId', '==', getCurrentUser().uid)
            .where('isAdmin', '==', true)
            .get();
        
        for (const doc of teamMembersQuery.docs) {
            const memberData = doc.data();
            
            // Check if we already have this team
            const existingTeam = adminTeams.find(team => team.id === memberData.teamId);
            if (!existingTeam) {
                // Get team details
                const teamDoc = await firebase.firestore()
                    .collection('teams')
                    .doc(memberData.teamId)
                    .get();
                
                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    adminTeams.push({
                        id: teamDoc.id,
                        name: teamData.name,
                        description: teamData.description,
                        createdAt: teamData.createdAt,
                        memberCount: teamData.members ? teamData.members.length : 0,
                        isDefault: teamData.isDefault || false
                    });
                }
            }
        }
        
        setAdminTeams(adminTeams);
        console.log('Admin teams loaded:', adminTeams.length);
        
        // Update the admin teams display
        updateAdminTeamsDisplay();
        
        // Populate team filter
        populateTeamFilter();
        
        return adminTeams;
        
    } catch (error) {
        console.error('Error loading admin teams:', error);
        setAdminTeams([]);
        return [];
    }
}

// Update admin teams display
function updateAdminTeamsDisplay() {
    const adminTeamsList = document.getElementById('adminTeamsList');
    if (!adminTeamsList) return;
    
    const adminTeams = getAdminTeams();
    
    if (adminTeams.length === 0) {
        adminTeamsList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <h6 class="text-muted">No Admin Teams</h6>
                <p class="text-muted small">You are not an admin of any teams yet.</p>
                <button class="btn btn-primary btn-sm" onclick="createNewTeam()">
                    <i class="fas fa-plus me-1"></i>Create Your First Team
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="row">';
    
    adminTeams.forEach(team => {
        const isCurrentTeam = team.id === getCurrentTeam();
        const teamCardClass = isCurrentTeam ? 'border-primary' : 'border-light';
        const teamCardBg = isCurrentTeam ? 'bg-primary bg-opacity-10' : '';
        
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card ${teamCardClass} ${teamCardBg} h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${team.name}</h6>
                            ${isCurrentTeam ? '<span class="badge bg-primary">Current</span>' : ''}
                        </div>
                        <p class="card-text small text-muted mb-2">${team.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>${team.memberCount} members
                            </small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-sm" onclick="switchToTeam('${team.id}')" ${isCurrentTeam ? 'disabled' : ''}>
                                    <i class="fas fa-eye me-1"></i>View
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="manageTeam('${team.id}')">
                                    <i class="fas fa-cog me-1"></i>Manage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    adminTeamsList.innerHTML = html;
}

// Populate team filter dropdown
function populateTeamFilter() {
    const teamFilter = document.getElementById('teamFilter');
    if (!teamFilter) return;
    
    const adminTeams = getAdminTeams();
    
    // Clear existing options except the first one
    teamFilter.innerHTML = '<option value="">All Teams</option>';
    
    adminTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamFilter.appendChild(option);
    });
}

// Switch to a different team
async function switchToTeam(teamId) {
    try {
        console.log('Switching to team:', teamId);
        
        // Update current team and selected team
        setCurrentTeam(teamId);
        setSelectedTeamId(teamId);
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('teamId', teamId);
        window.history.pushState({}, '', url);
        
        // Reload team data
        await loadTeamData();
        
        // Update displays
        updateDashboard();
        updateAdminTeamsDisplay();
        
        // Show success message
        showAlert(`Switched to team: ${getAdminTeams().find(t => t.id === teamId)?.name}`, 'success');
        
    } catch (error) {
        console.error('Error switching team:', error);
        showAlert('Error switching team. Please try again.', 'danger');
    }
}

// Create new team
async function createNewTeam() {
    try {
        const teamName = prompt('Enter team name:');
        if (!teamName) return;
        
        const teamDescription = prompt('Enter team description (optional):');
        
        const teamData = {
            name: teamName,
            description: teamDescription || '',
            createdBy: getCurrentUser().uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [getCurrentUser().uid],
            isDefault: false,
            type: 'project',
            code: generateTeamCode()
        };
        
        const teamRef = await firebase.firestore()
            .collection('teams')
            .add(teamData);
        
        console.log('New team created:', teamRef.id);
        
        // Reload admin teams
        await loadAdminTeams();
        
        // Switch to the new team
        await switchToTeam(teamRef.id);
        
        showAlert(`Team "${teamName}" created successfully!`, 'success');
        
    } catch (error) {
        console.error('Error creating new team:', error);
        showAlert('Error creating team. Please try again.', 'danger');
    }
}

// Refresh admin teams
async function refreshAdminTeams() {
    try {
        await loadAdminTeams();
        showAlert('Admin teams refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing admin teams:', error);
        showAlert('Error refreshing admin teams.', 'danger');
    }
}

// Create default team for testing
async function createDefaultTeam() {
    try {
        console.log('Creating default team for user:', getCurrentUser().uid);
        
        const teamData = {
            name: 'Code Ninja Team',
            description: 'Default team for testing team dashboard functionality',
            createdBy: getCurrentUser().uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [getCurrentUser().uid],
            isDefault: true,
            type: 'project',
            code: generateTeamCode()
        };
        
        const teamRef = await firebase.firestore()
            .collection('teams')
            .add(teamData);
        
        console.log('Default team created with ID:', teamRef.id);
        setCurrentTeam(teamRef.id);
        
        // Update user profile with team ID
        await firebase.firestore()
            .collection('users')
            .doc(getCurrentUser().uid)
            .update({
                teamId: teamRef.id,
                isTeamAdmin: true,
                updatedAt: new Date()
            });
        
        console.log('User profile updated with team ID');
        return teamRef.id;
        
    } catch (error) {
        console.error('Error creating default team:', error);
        // Use a fallback team ID
        const fallbackTeamId = 'default-team-' + getCurrentUser().uid;
        setCurrentTeam(fallbackTeamId);
        return fallbackTeamId;
    }
}

// Create default team and refresh dashboard
async function createDefaultTeamAndRefresh() {
    try {
        console.log('Creating default team and refreshing dashboard...');
        
        // Show loading message
        const dashboardContainer = document.querySelector('.main-content');
        if (dashboardContainer) {
            dashboardContainer.innerHTML = `
                <div class="container">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <h3 class="mt-3">Creating Team...</h3>
                        <p class="text-muted">Please wait while we set up your team dashboard.</p>
                    </div>
                </div>
            `;
        }
        
        // Create the team
        const teamId = await createDefaultTeam();
        
        if (teamId) {
            // Load team data
            await loadTeamData();
            
            
            
            // Initialize charts
            initializeCharts();
            
            // Set up real-time listeners
            setupRealtimeListeners();
            
            // Update dashboard
            updateDashboard();
            
            // Show team dashboard
            showTeamDashboard();
            
            // Show success message
            showAlert('Default team created successfully! You can now view your team dashboard.', 'success');
        } else {
            throw new Error('Failed to create team');
        }
        
    } catch (error) {
        console.error('Error creating default team and refreshing:', error);
        showAlert('Error creating team. Please try again or contact support.', 'danger');
        
        // Show the no team message again
        setTimeout(() => {
            showNoTeamMessage();
        }, 2000);
    }
}

// Generate team code
function generateTeamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper function to safely convert dates to ISO string
function safeToISOString(dateValue) {
    if (!dateValue) {
        return new Date().toISOString();
    }
    
    try {
        // If it's a Firestore Timestamp, convert to Date first
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate().toISOString();
        }
        
        // If it's already a Date object
        if (dateValue instanceof Date) {
            return dateValue.toISOString();
        }
        
        // If it's a string or number, try to create a Date
        return new Date(dateValue).toISOString();
    } catch (error) {
        console.warn('Error converting date to ISO string:', error, 'Using current date instead');
        return new Date().toISOString();
    }
}

// Helper function to safely convert any date value to Date object
function safeToDate(dateValue) {
    if (!dateValue) {
        return new Date();
    }
    
    try {
        // If it's a Firestore Timestamp, convert to Date first
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
        }
        
        // If it's already a Date object
        if (dateValue instanceof Date) {
            return dateValue;
        }
        
        // If it's a string or number, try to create a Date
        return new Date(dateValue);
    } catch (error) {
        console.warn('Error converting date value to Date:', error, 'Using current date instead');
        return new Date();
    }
}

// Load team data
async function loadTeamData(hasRetried = false) {
    try {
        const currentTeamId = getCurrentTeam();
        console.log('Loading team data for team ID:', currentTeamId);
        
        if (!currentTeamId) {
            console.error('No team ID available');
            if (!hasRetried) {
                await createDefaultTeamAndRefresh();
            } else {
                showNoTeamMessage();
            }
            return;
        }
        
        // Load team information
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(currentTeamId)
            .get();
        
        if (teamDoc.exists) {
            const teamData = teamDoc.data();
            console.log('Team data loaded:', teamData);
            
            // Check if current user is admin of this team
            const currentUser = getCurrentUser();
            const isAdmin = teamData.createdBy === currentUser.uid;
            setIsTeamAdmin(isAdmin);
            setCurrentTeamOwner(teamData.createdBy);
            
            console.log('User admin status:', isAdmin, 'Team owner:', teamData.createdBy);
            
            // Update team information display
            const teamNameElement = document.getElementById('teamName');
            const teamDescriptionElement = document.getElementById('teamDescription');
            
            if (teamNameElement) teamNameElement.textContent = teamData.name;
            if (teamDescriptionElement) teamDescriptionElement.textContent = teamData.description || 'No description';
            
            // Update page title
            document.title = `${teamData.name} - Team Dashboard - QuickNotes AI`;
            
            // Load team members
            await loadTeamMembers(teamData.members || []);
            
            // Load team tasks (filtered based on admin status)
            await loadTeamTasks();
            
            // Update dashboard statistics
            updateTaskStatistics();
            
        } else {
            console.error('Team not found:', currentTeamId);
            if (!hasRetried) {
                console.log('Team not found, attempting to create default team...');
                await createDefaultTeamAndRefresh();
            } else {
                console.log('Team creation failed, showing no team message');
                showNoTeamMessage();
            }
        }
        
    } catch (error) {
        console.error('Error loading team data:', error);
        
        // Provide more specific error messages
        if (error.code === 'permission-denied') {
            showAlert('Permission denied. You may not have access to this team.', 'danger');
        } else if (error.code === 'not-found') {
            showAlert('Team not found. Creating a new team for you...', 'info');
            if (!hasRetried) {
                await createDefaultTeamAndRefresh();
            } else {
                showNoTeamMessage();
            }
        } else if (error.message && error.message.includes('Firebase')) {
            showAlert('Firebase connection error. Please check your internet connection and try again.', 'danger');
        } else {
            showAlert('Error loading team data. Please try again.', 'danger');
        }
    }
}

// Load team members
async function loadTeamMembers(memberIds) {
    try {
        console.log('Loading team members for IDs:', memberIds);
        const members = [];
        
        if (!memberIds || memberIds.length === 0) {
            console.log('No member IDs provided, showing only current user');
            const currentUser = getCurrentUser();
            if (currentUser) {
                const teamCreatorId = getCurrentTeamOwner();
                const isCurrentUserTeamCreator = currentUser.uid === teamCreatorId;
                members.push({
                    id: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                    email: currentUser.email,
                    isAdmin: isCurrentUserTeamCreator
                });
            }
            setTeamMembers(members);
            updateTeamMembersDisplay();
            return;
        }
        
        // Get team creator ID for role determination
        const teamCreatorId = getCurrentTeamOwner();
        
        // Always include the current user as a team member
        const currentUser = getCurrentUser();
        if (currentUser) {
            const isCurrentUserTeamCreator = currentUser.uid === teamCreatorId;
            members.push({
                id: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                isAdmin: isCurrentUserTeamCreator // Only admin if team creator
            });
            console.log('Added current user as team member:', currentUser.email, 'Is Team Creator:', isCurrentUserTeamCreator);
        }
        
        // Load other team members
        for (const memberId of memberIds) {
            // Skip if it's the current user (already added)
            if (memberId === currentUser?.uid) {
                continue;
            }
            
            try {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(memberId)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const isTeamCreator = memberId === teamCreatorId;
                    members.push({
                        id: memberId,
                        name: userData.displayName || userData.email,
                        email: userData.email,
                        isAdmin: isTeamCreator // Only admin if team creator
                    });
                    console.log('Added team member:', userData.email, 'Is Team Creator:', isTeamCreator);
                } else {
                    console.log('User document not found for ID:', memberId);
                    // Add placeholder for missing user
                    members.push({
                        id: memberId,
                        name: 'Unknown User',
                        email: `User ID: ${memberId}`,
                        isAdmin: false
                    });
                }
            } catch (memberError) {
                console.error('Error loading member:', memberId, memberError);
                // Add error placeholder
                members.push({
                    id: memberId,
                    name: 'Error Loading',
                    email: `User ID: ${memberId}`,
                    isAdmin: false
                });
            }
        }
        
        console.log('Total team members loaded:', members.length);
        setTeamMembers(members);
        updateTeamMembersDisplay();
        
    } catch (error) {
        console.error('Error loading team members:', error);
        // Fallback: at least show current user
        const currentUser = getCurrentUser();
        if (currentUser) {
            const teamCreatorId = getCurrentTeamOwner();
            const isCurrentUserTeamCreator = currentUser.uid === teamCreatorId;
            setTeamMembers([{
                id: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                isAdmin: isCurrentUserTeamCreator
            }]);
            updateTeamMembersDisplay();
        }
    }
}

// Load team tasks
async function loadTeamTasks() {
    try {
        console.log('Loading team tasks for team ID:', getCurrentTeam());
        
        const tasks = [];
        
        // First, try to load tasks with teamAssignment structure
        console.log('Loading tasks with teamAssignment structure...');
        const teamTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamAssignment.assignedToTeam', '==', true)
            .limit(50)
            .get();
        
        console.log('Found tasks with teamAssignment:', teamTasksSnapshot.size);
        
        teamTasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            console.log('Found team task (teamAssignment):', doc.id, 'Title:', taskData.title);
            
            tasks.push({
                id: doc.id,
                ...taskData,
                createdAt: taskData.createdAt ? (taskData.createdAt.toDate ? taskData.createdAt.toDate() : new Date(taskData.createdAt)) : new Date(),
                updatedAt: taskData.updatedAt ? (taskData.updatedAt.toDate ? taskData.updatedAt.toDate() : new Date(taskData.updatedAt)) : new Date(),
                dueDate: taskData.dueDate ? (taskData.dueDate.toDate ? taskData.dueDate.toDate() : new Date(taskData.dueDate)) : null
            });
        });
        
        // Also load tasks with taskType === 'team'
        console.log('Loading tasks with taskType === team...');
        const legacyTeamTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('taskType', '==', 'team')
            .limit(50)
            .get();
        
        console.log('Found tasks with taskType team:', legacyTeamTasksSnapshot.size);
        
        legacyTeamTasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            
            // Check if this task is already in our list
            const existingTask = tasks.find(t => t.id === doc.id);
            if (!existingTask) {
                console.log('Found legacy team task:', doc.id, 'Title:', taskData.title);
                
                const teamAssignmentInfo = {
                    teamId: taskData.teamId || getCurrentTeam(),
                    teamName: taskData.teamName || 'Code Ninja Team',
                    memberId: taskData.assignedTo,
                    memberName: taskData.assignedTo || 'Unassigned',
                    assignedToTeam: true,
                    assignedAt: safeToISOString(taskData.createdAt),
                    assignedBy: taskData.createdBy || getCurrentUser().uid
                };
                
                tasks.push({
                    id: doc.id,
                    ...taskData,
                    createdAt: safeToDate(taskData.createdAt),
                    updatedAt: safeToDate(taskData.updatedAt),
                    dueDate: safeToDate(taskData.dueDate),
                    teamAssignment: teamAssignmentInfo
                });
            }
        });
        
        // Also load tasks by teamId field
        console.log('Loading tasks with teamId field...');
        const teamIdTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamId', '==', getCurrentTeam())
            .limit(50)
            .get();
        
        console.log('Found tasks with teamId:', teamIdTasksSnapshot.size);
        
        teamIdTasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            
            // Check if this task is already in our list
            const existingTask = tasks.find(t => t.id === doc.id);
            if (!existingTask) {
                console.log('Found team task (teamId):', doc.id, 'Title:', taskData.title);
                
                const teamAssignmentInfo = {
                    teamId: getCurrentTeam(),
                    teamName: taskData.teamName || 'Code Ninja Team',
                    memberId: taskData.assignedTo || 'Unassigned',
                    memberName: taskData.assignedTo || 'Unassigned',
                    assignedToTeam: true,
                    assignedAt: safeToISOString(taskData.createdAt),
                    assignedBy: taskData.createdBy || getCurrentUser().uid
                };
                
                tasks.push({
                    id: doc.id,
                    ...taskData,
                    createdAt: safeToDate(taskData.createdAt),
                    updatedAt: safeToDate(taskData.updatedAt),
                    dueDate: safeToDate(taskData.dueDate),
                    teamAssignment: teamAssignmentInfo
                });
            }
        });
        
        // Also check for tasks with assignedTo field that might be team tasks
        console.log('Loading tasks with assignedTo field...');
        const assignedTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('assignedTo', '!=', null)
            .limit(50)
            .get();
        
        console.log('Found tasks with assignedTo:', assignedTasksSnapshot.size);
        
        assignedTasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            
            // Check if this task is already in our list
            const existingTask = tasks.find(t => t.id === doc.id);
            if (!existingTask && taskData.assignedTo && taskData.assignedTo !== getCurrentUser().email) {
                console.log('Found team task (assignedTo):', doc.id, 'Title:', taskData.title);
                
                const teamAssignmentInfo = {
                    teamId: getCurrentTeam(),
                    teamName: 'Team Task', // Generic name for team tasks
                    memberId: taskData.assignedTo,
                    memberName: taskData.assignedTo,
                    assignedToTeam: true,
                    assignedAt: taskData.createdAt ? (taskData.createdAt.toDate ? taskData.createdAt.toDate().toISOString() : new Date(taskData.createdAt).toISOString()) : new Date().toISOString(),
                    assignedBy: taskData.createdBy || getCurrentUser().uid
                };
                
                tasks.push({
                    id: doc.id,
                    ...taskData,
                    createdAt: safeToDate(taskData.createdAt),
                    updatedAt: safeToDate(taskData.updatedAt),
                    dueDate: safeToDate(taskData.dueDate),
                    teamAssignment: teamAssignmentInfo
                });
            }
        });
        
        // Remove duplicates
        const uniqueTasks = tasks.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
        );
        
        // Sort all tasks by creation date in JavaScript
        uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
        
        console.log('Total team tasks loaded:', uniqueTasks.length);
        console.log('Team tasks:', uniqueTasks);
        
        // Add manual console commands for debugging
        window.debugTeamTasks = () => {
            console.log('=== TEAM TASKS DEBUG ===');
            console.log('Current team:', getCurrentTeam());
            console.log('Team tasks count:', getTeamTasks().length);
            console.log('All team tasks:', getTeamTasks());
            console.log('Tasks with assignedTo:', getTeamTasks().filter(t => t.assignedTo));
            console.log('Tasks with teamAssignment:', getTeamTasks().filter(t => t.teamAssignment));
            console.log('Tasks with taskType team:', getTeamTasks().filter(t => t.taskType === 'team'));
        };
        
        window.forceRefreshTeamTasks = async () => {
            console.log('Force refreshing team tasks...');
            await loadTeamTasks();
            updateTeamTasksDisplay();
            updateTaskStatistics();
            console.log('Team tasks refreshed!');
        };
        
        window.createSampleTeamTasks = async () => {
            console.log('Creating sample team tasks...');
            await createSampleTeamTasksIfNeeded();
            // Reload data after creating tasks
            await loadTeamData();
            updateDashboard();
            console.log('Sample tasks created and dashboard updated!');
        };
        
        window.debugTeamDashboard = () => {
            console.log('=== TEAM DASHBOARD DEBUG ===');
            console.log('Current user:', getCurrentUser());
            console.log('Current team:', getCurrentTeam());
            console.log('Is premium user:', getIsPremiumUser());
            console.log('Team tasks count:', getTeamTasks().length);
            console.log('Team members count:', getTeamMembers().length);
            console.log('Firebase auth state:', firebase.auth().currentUser);
            console.log('DOM elements:');
            console.log('- recentTeamTasksList:', document.getElementById('recentTeamTasksList'));
            console.log('- teamName:', document.getElementById('teamName'));
            console.log('- teamDescription:', document.getElementById('teamDescription'));
        };
        
        // Add function to delete all sample data
        window.deleteAllSampleData = async () => {
            try {
                console.log('Starting deletion of all sample data...');
                
                // Sample team identifiers
                const sampleTeamNames = [
                    'Development Team',
                    'Marketing Team', 
                    'Design Team',
                    'Code Ninja Team'
                ];
                
                const sampleTeamCodes = ['DEV001', 'MKT002', 'DSN003'];
                
                // Find all sample teams
                const teamsSnapshot = await firebase.firestore()
                    .collection('teams')
                    .get();
                
                let deletedTeams = 0;
                let deletedTasks = 0;
                
                for (const teamDoc of teamsSnapshot.docs) {
                    const teamData = teamDoc.data();
                    const shouldDelete = 
                        sampleTeamNames.includes(teamData.name) ||
                        sampleTeamCodes.includes(teamData.code) ||
                        teamData.isDefault === true;
                    
                    if (shouldDelete) {
                        console.log(`Deleting sample team: ${teamData.name} (${teamData.code})`);
                        
                        // Delete all tasks associated with this team
                        const tasksSnapshot = await firebase.firestore()
                            .collection('tasks')
                            .where('teamId', '==', teamDoc.id)
                            .get();
                        
                        for (const taskDoc of tasksSnapshot.docs) {
                            await taskDoc.ref.delete();
                            deletedTasks++;
                        }
                        
                        // Also delete tasks with teamAssignment for this team
                        const teamTasksSnapshot = await firebase.firestore()
                            .collection('tasks')
                            .where('teamAssignment.teamId', '==', teamDoc.id)
                            .get();
                        
                        for (const taskDoc of teamTasksSnapshot.docs) {
                            await taskDoc.ref.delete();
                            deletedTasks++;
                        }
                        
                        // Delete the team
                        await teamDoc.ref.delete();
                        deletedTeams++;
                    }
                }
                
                // Remove team references from user profiles
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where('teamId', '!=', null)
                    .get();
                
                for (const userDoc of usersSnapshot.docs) {
                    const userData = userDoc.data();
                    if (userData.teamId) {
                        // Check if the referenced team still exists
                        const teamDoc = await firebase.firestore()
                            .collection('teams')
                            .doc(userData.teamId)
                            .get();
                        
                        if (!teamDoc.exists) {
                            // Remove the teamId reference
                            await userDoc.ref.update({
                                teamId: null,
                                isTeamAdmin: false
                            });
                            console.log(`Removed team reference from user: ${userData.email}`);
                        }
                    }
                }
                
                console.log(`Deleted ${deletedTeams} sample teams and ${deletedTasks} associated tasks`);
                showAlert(`Successfully deleted ${deletedTeams} sample teams and ${deletedTasks} tasks!`, 'success');
                
                // Refresh the dashboard
                await manualRefresh();
                
            } catch (error) {
                console.error('Error deleting sample data:', error);
                showAlert('Error deleting sample data. Please try again.', 'danger');
            }
        };
        
        console.log('Debug commands available:');
        console.log('- debugTeamTasks() - Show detailed team task info');
        console.log('- forceRefreshTeamTasks() - Force refresh team tasks');
        console.log('- createSampleTeamTasks() - Create sample team tasks');
        console.log('- debugTeamDashboard() - Show comprehensive dashboard debug info');
        console.log('- deleteAllSampleData() - Delete all sample teams and tasks');
        
        // Filter tasks based on admin status
        const currentUser = getCurrentUser();
        const isAdmin = getIsTeamAdmin();
        const selectedTeamId = getSelectedTeamId();
        
        let filteredTasks = uniqueTasks;
        
        if (selectedTeamId) {
            // If a specific team is selected, filter by that team
            filteredTasks = uniqueTasks.filter(task => {
                const taskTeamId = task.teamId || (task.teamAssignment && task.teamAssignment.teamId);
                return taskTeamId === selectedTeamId;
            });
        } else if (!isAdmin) {
            // Non-admin users only see tasks assigned to them
            filteredTasks = uniqueTasks.filter(task => {
                const assignedTo = task.assignedTo || (task.teamAssignment && task.teamAssignment.memberId);
                return assignedTo === currentUser.uid;
            });
        }
        // Admin users see all tasks (no filtering needed)
        
        console.log(`Filtered tasks: ${filteredTasks.length} out of ${uniqueTasks.length} total tasks`);
        console.log('User is admin:', isAdmin, 'Selected team:', selectedTeamId);
        
        setTeamTasks(filteredTasks);
        updateTeamTasksDisplay();
        
    } catch (error) {
        console.error('Error loading team tasks:', error);
        showAlert('Error loading team tasks. Please try again.', 'danger');
    }
}

// Load tasks for a specific team
async function loadTasksForTeam(teamId) {
    try {
        console.log('Loading tasks for team:', teamId);
        
        // Show loading status
        const statusElement = document.getElementById('teamTasksStatus');
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';
            statusElement.className = 'badge bg-info me-2';
        }
        
        // Query tasks for the specific team
        const tasksQuery = await firebase.firestore()
            .collection('tasks')
            .where('teamId', '==', teamId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const tasks = [];
        
        for (const doc of tasksQuery.docs) {
            const taskData = doc.data();
            tasks.push({
                id: doc.id,
                ...taskData,
                createdAt: safeToDate(taskData.createdAt),
                updatedAt: safeToDate(taskData.updatedAt),
                dueDate: taskData.dueDate ? safeToDate(taskData.dueDate) : null
            });
        }
        
        console.log(`Loaded ${tasks.length} tasks for team ${teamId}`);
        
        // Set the tasks temporarily for filtering
        setTeamTasks(tasks);
        
        // Apply other filters
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const memberFilter = document.getElementById('memberFilter').value;
        
        let filteredTasks = tasks;
        
        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }
        
        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }
        
        if (memberFilter) {
            filteredTasks = filteredTasks.filter(task => 
                task.assignedTo === memberFilter || 
                (task.teamAssignment && task.teamAssignment.memberName === memberFilter)
            );
        }
        
        setFilteredTasks(filteredTasks);
        resetPagination();
        updateTeamTasksDisplay();
        
        // Update status
        if (statusElement) {
            statusElement.innerHTML = `<i class="fas fa-check me-1"></i>${tasks.length} tasks`;
            statusElement.className = 'badge bg-success me-2';
        }
        
    } catch (error) {
        console.error('Error loading tasks for team:', error);
        
        // Update status
        const statusElement = document.getElementById('teamTasksStatus');
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Error';
            statusElement.className = 'badge bg-danger me-2';
        }
        
        setTeamTasks([]);
        setFilteredTasks([]);
        updateTeamTasksDisplay();
    }
}

// Update team tasks display with pagination
async function updateTeamTasksDisplay() {
    const tasksContainer = document.getElementById('recentTeamTasksList');
    const statusIndicator = document.getElementById('teamTasksStatus');
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (!tasksContainer) return;
    
    // Update status indicator
    if (statusIndicator) {
        if (getTeamTasks().length === 0) {
            statusIndicator.className = 'badge bg-warning me-2';
            statusIndicator.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>No Tasks';
        } else {
            statusIndicator.className = 'badge bg-success me-2';
            statusIndicator.innerHTML = `<i class="bi bi-check-circle me-1"></i>${getTeamTasks().length} Tasks`;
        }
    }
    
    if (getTeamTasks().length === 0) {
        tasksContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                <p class="text-muted mt-2">No team tasks found</p>
                <button class="btn btn-outline-primary btn-sm" onclick="createSampleTeamTasks()">
                    <i class="bi bi-plus-circle me-1"></i>Create Sample Tasks
                </button>
            </div>
        `;
        
        // Hide pagination controls
        if (pageInfo) pageInfo.style.display = 'none';
        if (prevPageBtn) prevPageBtn.style.display = 'none';
        if (nextPageBtn) nextPageBtn.style.display = 'none';
        return;
    }
    
    // Calculate pagination
    const tasksToDisplay = getFilteredTasks().length > 0 ? getFilteredTasks() : getTeamTasks();
    const totalTasks = tasksToDisplay.length;
    const tasksPerPage = getTasksPerPage();
    const totalPages = Math.ceil(totalTasks / tasksPerPage);
    const currentPage = getCurrentPage();
    
    // Ensure current page is within bounds
    if (currentPage > totalPages) {
        setCurrentPage(totalPages);
    }
    if (currentPage < 1) {
        setCurrentPage(1);
    }
    
    // Update pagination controls
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
        prevPageBtn.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages;
        nextPageBtn.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = Math.min(startIndex + tasksPerPage, totalTasks);
    const currentPageTasks = tasksToDisplay.slice(startIndex, endIndex);
    
    // Create task grid container
    let tasksHTML = '<div class="task-grid">';
    
    for (const task of currentPageTasks) {
        console.log('Processing task:', task.id, 'Title:', task.title);
        console.log('Task data:', {
            assignedTo: task.assignedTo,
            teamAssignment: task.teamAssignment,
            taskType: task.taskType,
            teamId: task.teamId
        });
        
        const statusClass = task.status === 'completed' ? 'completed' : 
                           task.status === 'in-progress' ? 'in-progress' : 'pending';
        
        // Format dates
        const createdDate = formatDetailedDate(task.createdAt);
        const dueDate = formatDetailedDate(task.dueDate);
        
        // Get input method
        const inputMethod = task.inputMethod || 'manual';
        const inputMethodIcon = getInputMethodIcon(inputMethod);
        const inputMethodBadge = `<div class="task-tile-input-method ${inputMethod}">
            <i class="bi ${inputMethodIcon}"></i>
            <span>${inputMethod}</span>
        </div>`;
        
        // Team assignment badge
        let teamTaskLabel = '';
        let teamName = '';
        let teamMemberName = '';
        let isTeamTask = false;
        
        // Check if this is a team task
        if (task.teamAssignment && task.teamAssignment.assignedToTeam) {
            console.log('Task has teamAssignment structure');
            isTeamTask = true;
            teamName = task.teamAssignment.teamName || 'Unknown Team';
            
            // Try to get member name from different possible sources
            if (task.teamAssignment.memberName && task.teamAssignment.memberName !== 'Unassigned') {
                teamMemberName = task.teamAssignment.memberName;
                console.log('Using memberName from teamAssignment:', teamMemberName);
            } else if (task.teamAssignment.memberId) {
                teamMemberName = await getMemberDisplayName(task.teamAssignment.memberId) || 'Unassigned';
                console.log('Using memberId from teamAssignment:', task.teamAssignment.memberId, 'Result:', teamMemberName);
            } else if (task.assignedTo) {
                teamMemberName = await getMemberDisplayName(task.assignedTo) || 'Unassigned';
                console.log('Using assignedTo field:', task.assignedTo, 'Result:', teamMemberName);
            } else {
                teamMemberName = 'Unassigned';
                console.log('No member ID found, setting to Unassigned');
            }
        } else if (task.taskType === 'team' && task.teamId && task.assignedTo) {
            console.log('Task has legacy team structure');
            isTeamTask = true;
            teamName = task.teamName || 'Unknown Team';
            teamMemberName = await getMemberDisplayName(task.assignedTo) || 'Unassigned';
            console.log('Using assignedTo from legacy structure:', task.assignedTo, 'Result:', teamMemberName);
        }

        const isCompleted = task.status === 'completed';
        
        tasksHTML += `
            <div class="task-tile ${statusClass}" data-task-id="${task.id}">
                ${isTeamTask ? `<div class="task-tile-team-label">
                    <i class="fas fa-users"></i>
                    <span>TEAM</span>
                </div>` : ''}
                <div class="task-tile-header">
                    <div class="task-tile-input-method ${inputMethod}">
                        <i class="fas ${inputMethodIcon}"></i>
                        <span>${inputMethod}</span>
                    </div>
                    <div class="task-tile-priority priority-${task.priority || 'medium'}">${task.priority || 'Medium'}</div>
                </div>
                <div class="task-tile-title-section">
                    <h6 class="task-tile-title ${isCompleted ? 'completed' : ''}">${task.title}</h6>
                </div>
                <div class="task-tile-description ${isCompleted ? 'completed' : ''}">${task.description || 'No description'}</div>
                <div class="task-tile-dates">
                    <div class="task-date-item">
                        <i class="fas fa-calendar-alt text-warning"></i>
                        <span class="task-date-label">Due:</span>
                        <span class="task-date-value">${dueDate}</span>
                    </div>
                    <div class="task-date-item">
                        <i class="fas fa-calendar-plus text-primary"></i>
                        <span class="task-date-label">Created:</span>
                        <span class="task-date-value">${createdDate}</span>
                    </div>
                    ${isTeamTask ? `
                    <div class="task-date-item">
                        <i class="fas fa-users text-info"></i>
                        <span class="task-date-label">Team:</span>
                        <span class="task-date-value">${teamName}</span>
                    </div>
                    <div class="task-date-item">
                        <i class="fas fa-user text-secondary"></i>
                        <span class="task-date-label">Member:</span>
                        <span class="task-date-value">${teamMemberName}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="task-tile-meta">
                    <span class="task-tile-status status-${task.status}">${task.status}</span>
                </div>
            </div>
        `;
    }
    
    tasksHTML += '</div>';
    
    tasksContainer.innerHTML = tasksHTML;
}

// Helper function to get member display name
async function getMemberDisplayName(memberId) {
    if (!memberId || memberId === 'Unassigned' || memberId === 'unassigned') {
        return 'Unassigned';
    }
    
    try {
        console.log('Getting member display name for ID:', memberId);
        
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(memberId)
            .get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const displayName = userData.displayName || userData.email?.split('@')[0] || 'Unknown User';
            console.log('Found member name:', displayName, 'for ID:', memberId);
            return displayName;
        } else {
            console.log('User document not found for ID:', memberId);
            return 'Unknown User';
        }
    } catch (error) {
        console.error('Error getting member display name for ID:', memberId, error);
        return 'Error Loading User';
    }
}

// Helper function to format detailed dates (same as in task.html)
function formatDetailedDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Format the date
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Add relative time for recent dates
    if (diffDays === 0) {
        return `${formattedDate} (Today)`;
    } else if (diffDays === 1) {
        return `${formattedDate} (Yesterday)`;
    } else if (diffDays < 7) {
        return `${formattedDate} (${diffDays} days ago)`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${formattedDate} (${weeks} week${weeks > 1 ? 's' : ''} ago)`;
    } else {
        return formattedDate;
    }
}

// Helper function to get input method icon
function getInputMethodIcon(inputMethod) {
    switch (inputMethod) {
        case 'voice':
            return 'fas fa-microphone';
        case 'manual':
        default:
            return 'fas fa-keyboard';
    }
}

// Pagination navigation functions
function nextPage() {
    const totalTasks = getTeamTasks().length;
    const tasksPerPage = getTasksPerPage();
    const totalPages = Math.ceil(totalTasks / tasksPerPage);
    const currentPage = getCurrentPage();
    
    if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
        updateTeamTasksDisplay();
    }
}

function previousPage() {
    const currentPage = getCurrentPage();
    
    if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
        updateTeamTasksDisplay();
    }
}

// Filter functions
function applyFilters() {
    const teamFilter = document.getElementById('teamFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const memberFilter = document.getElementById('memberFilter').value;
    
    // Update active filters
    setActiveFilters({
        team: teamFilter,
        status: statusFilter,
        priority: priorityFilter,
        member: memberFilter
    });
    
    // If team filter is selected and different from current team, load tasks for that team
    if (teamFilter && teamFilter !== getCurrentTeam()) {
        loadTasksForTeam(teamFilter);
        return;
    }
    
    // Apply filters to tasks
    const allTasks = getTeamTasks();
    let filteredTasks = allTasks;
    
    if (statusFilter) {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }
    
    if (memberFilter) {
        filteredTasks = filteredTasks.filter(task => 
            task.assignedTo === memberFilter || 
            (task.teamAssignment && task.teamAssignment.memberName === memberFilter)
        );
    }
    
    setFilteredTasks(filteredTasks);
    resetPagination();
    updateTeamTasksDisplay();
}

function clearFilters() {
    // Reset filter dropdowns
    document.getElementById('teamFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('memberFilter').value = '';
    
    // Reset filters
    resetFilters();
    resetPagination();
    updateTeamTasksDisplay();
}

function populateMemberFilter() {
    const memberFilter = document.getElementById('memberFilter');
    if (!memberFilter) {
        console.warn('Member filter element not found');
        return;
    }
    
    const tasks = getTeamTasks();
    const members = new Set();
    
    tasks.forEach(task => {
        if (task.teamAssignment && task.teamAssignment.memberName) {
            members.add(task.teamAssignment.memberName);
        }
    });
    
    const memberOptions = Array.from(members).sort();
    
    memberFilter.innerHTML = '<option value="">All Members</option>';
    memberOptions.forEach(member => {
        memberFilter.innerHTML += `<option value="${member}">${member}</option>`;
    });
}

// Update team members display
function updateTeamMembersDisplay() {
    const membersContainer = document.getElementById('teamMembersList');
    if (!membersContainer) {
        console.log('Team members container not found');
        return;
    }
    
    const members = getTeamMembers();
    console.log('Updating team members display with:', members.length, 'members');
    
    if (members.length === 0) {
        membersContainer.innerHTML = '<li class="text-muted">No members found</li>';
        return;
    }
    
    let membersHTML = '';
    members.forEach(member => {
        const avatarText = member.name ? member.name.charAt(0).toUpperCase() : '?';
        const isCurrentUser = member.id === getCurrentUser().uid;
        const isTeamOwner = member.id === getCurrentTeamOwner();
        const roleBadge = isTeamOwner ? 
            '<span class="badge bg-primary"><i class="fas fa-crown me-1"></i>Admin</span>' : 
            '<span class="badge bg-secondary">Member</span>';
        
        membersHTML += `
            <li class="member-item d-flex align-items-center justify-content-between p-2 border-bottom">
                <div class="d-flex align-items-center">
                    <div class="member-avatar me-2" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                        ${avatarText}
                    </div>
                    <div>
                        <div class="fw-semibold" style="font-size: 0.9rem;">
                            ${member.name}
                            ${isCurrentUser ? '<span class="badge bg-info ms-1" style="font-size: 0.7rem;">You</span>' : ''}
                        </div>
                        <small class="text-muted" style="font-size: 0.8rem;">${member.email}</small>
                    </div>
                </div>
                <div class="member-role">
                    ${roleBadge}
                </div>
            </li>
        `;
    });
    
    membersContainer.innerHTML = membersHTML;
    
    // Show/hide manage members button based on admin status
    const manageMembersBtn = document.getElementById('manageMembersBtn');
    if (manageMembersBtn) {
        const isAdmin = getIsTeamAdmin();
        if (isAdmin) {
            manageMembersBtn.style.display = 'inline-block';
        } else {
            manageMembersBtn.style.display = 'none';
        }
    }
    
    console.log('Team members display updated successfully');
}

// Update task statistics
function updateTaskStatistics() {
    const totalTasks = getTeamTasks().length;
    const completedTasks = getTeamTasks().filter(t => t.status === 'completed').length;
    const pendingTasks = getTeamTasks().filter(t => t.status === 'pending').length;
    const inProgressTasks = getTeamTasks().filter(t => t.status === 'in-progress').length;
    
    // Update statistics display - using the correct element IDs from the HTML
    const totalTasksElement = document.getElementById('totalTeamTasks');
    const completedTasksElement = document.getElementById('completedTeamTasks');
    const pendingTasksElement = document.getElementById('pendingTeamTasks');
    const teamMembersElement = document.getElementById('teamMembers');
    
    if (totalTasksElement) totalTasksElement.textContent = totalTasks;
    if (completedTasksElement) completedTasksElement.textContent = completedTasks;
    if (pendingTasksElement) pendingTasksElement.textContent = pendingTasks;
    if (teamMembersElement) teamMembersElement.textContent = getTeamMembers().length;
    
    // Calculate completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Update progress bar if it exists
    const progressBar = document.getElementById('completionProgressBar');
    if (progressBar) {
        progressBar.style.width = completionRate + '%';
    }
    
    // Update charts
    updateCharts();
    
    console.log('Statistics updated:', {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        teamMembers: getTeamMembers().length,
        completionRate
    });
}

// Initialize charts
function initializeCharts() {
    const teamCharts = getTeamCharts();
    
    // Task Status Chart (Enhanced Pie Chart)
    const statusCtx = document.getElementById('teamStatusChart');
    if (statusCtx) {
        teamCharts.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
        console.log('Enhanced status chart initialized');
    }
    
    // Team Priority Chart (Enhanced Bar Chart)
    const priorityCtx = document.getElementById('teamPriorityChart');
    if (priorityCtx) {
        teamCharts.priorityChart = new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                datasets: [{
                    label: 'Tasks by Priority',
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        console.log('Enhanced priority chart initialized');
    }
    
    // Member Performance Chart (Enhanced Bar Chart)
    const memberCtx = document.getElementById('memberPerformanceChart');
    if (memberCtx) {
        teamCharts.memberChart = new Chart(memberCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tasks Assigned',
                    data: [],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }, {
                    label: 'Tasks Completed',
                    data: [],
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        console.log('Enhanced member performance chart initialized');
    }
    
    // Activity Timeline Chart (Enhanced Line Chart)
    const timelineCtx = document.getElementById('activityTimelineChart');
    if (timelineCtx) {
        teamCharts.timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tasks Created',
                    data: [],
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Tasks Completed',
                    data: [],
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        mode: 'index',
                        intersect: false
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        console.log('Enhanced activity timeline chart initialized');
    }
    
    // Completion Trend Chart (Area Chart)
    const completionTrendCtx = document.getElementById('completionTrendChart');
    if (completionTrendCtx) {
        teamCharts.completionTrendChart = new Chart(completionTrendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Completion Rate',
                    data: [],
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Completion Rate: ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        console.log('Completion trend chart initialized');
    }
    
    // Workload Distribution Chart (Doughnut Chart)
    const workloadCtx = document.getElementById('workloadDistributionChart');
    if (workloadCtx) {
        teamCharts.workloadChart = new Chart(workloadCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(168, 85, 247, 0.8)'
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(168, 85, 247, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
        console.log('Workload distribution chart initialized');
    }
    
    // Store the charts back to namespace
    setTeamCharts(teamCharts);
    
    // Initialize chart event listeners
    initializeChartEventListeners();
}

// Initialize chart event listeners for insights and export buttons
function initializeChartEventListeners() {
    // Team Status Chart
    const teamStatusInsightsBtn = document.getElementById('teamStatusInsightsBtn');
    const teamStatusExportBtn = document.getElementById('teamStatusExportBtn');
    
    if (teamStatusInsightsBtn) {
        teamStatusInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('teamStatus'));
    }
    if (teamStatusExportBtn) {
        teamStatusExportBtn.addEventListener('click', () => exportChartData('teamStatus'));
    }
    
    // Team Priority Chart
    const teamPriorityInsightsBtn = document.getElementById('teamPriorityInsightsBtn');
    const teamPriorityExportBtn = document.getElementById('teamPriorityExportBtn');
    
    if (teamPriorityInsightsBtn) {
        teamPriorityInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('teamPriority'));
    }
    if (teamPriorityExportBtn) {
        teamPriorityExportBtn.addEventListener('click', () => exportChartData('teamPriority'));
    }
    
    // Member Performance Chart
    const memberPerformanceInsightsBtn = document.getElementById('memberPerformanceInsightsBtn');
    const memberPerformanceExportBtn = document.getElementById('memberPerformanceExportBtn');
    
    if (memberPerformanceInsightsBtn) {
        memberPerformanceInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('memberPerformance'));
    }
    if (memberPerformanceExportBtn) {
        memberPerformanceExportBtn.addEventListener('click', () => exportChartData('memberPerformance'));
    }
    
    // Activity Timeline Chart
    const activityTimelineInsightsBtn = document.getElementById('activityTimelineInsightsBtn');
    const activityTimelineExportBtn = document.getElementById('activityTimelineExportBtn');
    
    if (activityTimelineInsightsBtn) {
        activityTimelineInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('activityTimeline'));
    }
    if (activityTimelineExportBtn) {
        activityTimelineExportBtn.addEventListener('click', () => exportChartData('activityTimeline'));
    }
    
    // Completion Trend Chart
    const completionTrendInsightsBtn = document.getElementById('completionTrendInsightsBtn');
    const completionTrendExportBtn = document.getElementById('completionTrendExportBtn');
    
    if (completionTrendInsightsBtn) {
        completionTrendInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('completionTrend'));
    }
    if (completionTrendExportBtn) {
        completionTrendExportBtn.addEventListener('click', () => exportChartData('completionTrend'));
    }
    
    // Workload Distribution Chart
    const workloadDistributionInsightsBtn = document.getElementById('workloadDistributionInsightsBtn');
    const workloadDistributionExportBtn = document.getElementById('workloadDistributionExportBtn');
    
    if (workloadDistributionInsightsBtn) {
        workloadDistributionInsightsBtn.addEventListener('click', () => toggleAnalysisPanel('workloadDistribution'));
    }
    if (workloadDistributionExportBtn) {
        workloadDistributionExportBtn.addEventListener('click', () => exportChartData('workloadDistribution'));
    }
}

// Toggle analysis panel visibility
function toggleAnalysisPanel(chartType) {
    const panel = document.getElementById(chartType + 'AnalysisPanel');
    if (panel) {
        const isVisible = !panel.classList.contains('d-none');
        panel.classList.toggle('d-none');
        
        if (!isVisible) {
            // Generate analysis when showing panel
            generateChartAnalysis(chartType);
        }
    }
}

// Generate chart analysis and recommendations
function generateChartAnalysis(chartType) {
    const teamTasks = getTeamTasks();
    const teamMembers = getTeamMembers();
    
    switch (chartType) {
        case 'teamStatus':
            generateTeamStatusAnalysis(teamTasks);
            break;
        case 'teamPriority':
            generateTeamPriorityAnalysis(teamTasks);
            break;
        case 'memberPerformance':
            generateMemberPerformanceAnalysis(teamTasks, teamMembers);
            break;
        case 'activityTimeline':
            generateActivityTimelineAnalysis(teamTasks);
            break;
        case 'completionTrend':
            generateCompletionTrendAnalysis(teamTasks);
            break;
        case 'workloadDistribution':
            generateWorkloadDistributionAnalysis(teamTasks, teamMembers);
            break;
    }
}

// Update charts with current data
function updateCharts() {
    const teamCharts = getTeamCharts();
    const teamTasks = getTeamTasks();
    const teamMembers = getTeamMembers();
    
    console.log('Updating charts with data:', {
        tasksCount: teamTasks.length,
        membersCount: teamMembers.length,
        chartsAvailable: Object.keys(teamCharts)
    });
    
    // Update performance indicators
    updatePerformanceIndicators(teamTasks, teamMembers);
    
    // Update status chart
    if (teamCharts.statusChart) {
        const completed = teamTasks.filter(t => t.status === 'completed').length;
        const inProgress = teamTasks.filter(t => t.status === 'in-progress').length;
        const pending = teamTasks.filter(t => t.status === 'pending').length;
        
        teamCharts.statusChart.data.datasets[0].data = [completed, inProgress, pending];
        teamCharts.statusChart.update();
        console.log('Status chart updated:', [completed, inProgress, pending]);
    }
    
    // Update priority chart
    if (teamCharts.priorityChart) {
        const high = teamTasks.filter(t => t.priority === 'high').length;
        const medium = teamTasks.filter(t => t.priority === 'medium').length;
        const low = teamTasks.filter(t => t.priority === 'low').length;
        
        teamCharts.priorityChart.data.datasets[0].data = [high, medium, low];
        teamCharts.priorityChart.update();
        console.log('Priority chart updated:', [high, medium, low]);
    }
    
    // Update member performance chart
    if (teamCharts.memberChart) {
        console.log('Updating member performance chart...');
        console.log('Team members:', teamMembers);
        console.log('Team tasks:', teamTasks);
        
        const memberStats = {};
        const memberCompletedStats = {};
        
        // Initialize stats for all team members
        teamMembers.forEach(member => {
            const memberName = member.name || member.displayName || member.email;
            memberStats[memberName] = 0;
            memberCompletedStats[memberName] = 0;
        });
        
        // Count tasks assigned to each member
        teamTasks.forEach(task => {
            console.log('Processing task:', task.title, 'assignedTo:', task.assignedTo);
            if (task.assignedTo) {
                // Try different ways to match the assignedTo field
                const member = teamMembers.find(m => 
                    m.id === task.assignedTo || 
                    m.uid === task.assignedTo || 
                    m.email === task.assignedTo ||
                    (m.name && m.name === task.assignedTo) ||
                    (m.displayName && m.displayName === task.assignedTo)
                );
                
                if (member) {
                    const memberName = member.name || member.displayName || member.email;
                    memberStats[memberName]++;
                    if (task.status === 'completed') {
                        memberCompletedStats[memberName]++;
                    }
                    console.log('Found member:', memberName, 'incrementing count');
                } else {
                    console.log('No member found for assignedTo:', task.assignedTo);
                    // Add as "Unassigned" or "Other" category
                    if (!memberStats['Unassigned']) {
                        memberStats['Unassigned'] = 0;
                        memberCompletedStats['Unassigned'] = 0;
                    }
                    memberStats['Unassigned']++;
                    if (task.status === 'completed') {
                        memberCompletedStats['Unassigned']++;
                    }
                }
            }
        });
        
        // Ensure we have at least some data to display
        if (Object.keys(memberStats).length === 0) {
            memberStats['No Tasks'] = 0;
            memberCompletedStats['No Tasks'] = 0;
        }
        
        console.log('Final member stats:', memberStats);
        
        // Update chart data
        teamCharts.memberChart.data.labels = Object.keys(memberStats);
        teamCharts.memberChart.data.datasets[0].data = Object.values(memberStats);
        teamCharts.memberChart.data.datasets[1].data = Object.values(memberCompletedStats);
        teamCharts.memberChart.update();
        console.log('Member performance chart updated with labels:', Object.keys(memberStats), 'and data:', Object.values(memberStats));
    } else {
        console.warn('Member performance chart not found in teamCharts');
    }
    
    // Update activity timeline chart
    if (teamCharts.timelineChart) {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }
        
        const createdData = last7Days.map(date => {
            return teamTasks.filter(task => {
                const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
                return taskDate === date;
            }).length;
        });
        
        const completedData = last7Days.map(date => {
            return teamTasks.filter(task => {
                const taskDate = new Date(task.updatedAt || task.createdAt).toISOString().split('T')[0];
                return taskDate === date && task.status === 'completed';
            }).length;
        });
        
        teamCharts.timelineChart.data.labels = last7Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        teamCharts.timelineChart.data.datasets[0].data = createdData;
        teamCharts.timelineChart.data.datasets[1].data = completedData;
        teamCharts.timelineChart.update();
        console.log('Activity timeline chart updated');
    }
    
    // Update completion trend chart
    if (teamCharts.completionTrendChart) {
        const last7Days = [];
        const completionRates = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            last7Days.push(dateStr);
            
            const tasksForDay = teamTasks.filter(t => {
                const taskDate = new Date(t.createdAt);
                return taskDate.toDateString() === date.toDateString();
            });
            
            const completedForDay = tasksForDay.filter(t => t.status === 'completed').length;
            const completionRate = tasksForDay.length > 0 ? (completedForDay / tasksForDay.length) * 100 : 0;
            completionRates.push(Math.round(completionRate));
        }
        
        teamCharts.completionTrendChart.data.labels = last7Days;
        teamCharts.completionTrendChart.data.datasets[0].data = completionRates;
        teamCharts.completionTrendChart.update();
        console.log('Completion trend chart updated');
    }
    
    // Update workload distribution chart
    if (teamCharts.workloadChart) {
        const workloadData = teamMembers.map(member => {
            const assignedTasks = teamTasks.filter(t => t.assignedTo === member.email).length;
            return {
                name: member.name || member.displayName || member.email,
                tasks: assignedTasks
            };
        }).filter(m => m.tasks > 0);
        
        if (workloadData.length === 0) {
            workloadData.push({ name: 'No Tasks Assigned', tasks: 1 });
        }
        
        teamCharts.workloadChart.data.labels = workloadData.map(m => m.name);
        teamCharts.workloadChart.data.datasets[0].data = workloadData.map(m => m.tasks);
        teamCharts.workloadChart.update();
        console.log('Workload distribution chart updated');
    }
    
    // Store updated charts back to namespace
    setTeamCharts(teamCharts);
}

// Update performance indicators
function updatePerformanceIndicators(teamTasks, teamMembers) {
    // Status indicators
    const completedCount = teamTasks.filter(t => t.status === 'completed').length;
    const inProgressCount = teamTasks.filter(t => t.status === 'in-progress').length;
    const pendingCount = teamTasks.filter(t => t.status === 'pending').length;
    
    updateIndicator('completedTasksCount', completedCount);
    updateIndicator('inProgressTasksCount', inProgressCount);
    updateIndicator('pendingTasksCount', pendingCount);
    
    // Priority indicators
    const highPriorityCount = teamTasks.filter(t => t.priority === 'high').length;
    const mediumPriorityCount = teamTasks.filter(t => t.priority === 'medium').length;
    const lowPriorityCount = teamTasks.filter(t => t.priority === 'low').length;
    
    updateIndicator('highPriorityCount', highPriorityCount);
    updateIndicator('mediumPriorityCount', mediumPriorityCount);
    updateIndicator('lowPriorityCount', lowPriorityCount);
    
    // Member performance indicators
    const memberPerformance = teamMembers.map(member => {
        const assignedTasks = teamTasks.filter(t => t.assignedTo === member.email).length;
        const completedTasks = teamTasks.filter(t => t.assignedTo === member.email && t.status === 'completed').length;
        return {
            name: member.name || member.displayName || member.email,
            assigned: assignedTasks,
            completed: completedTasks,
            efficiency: assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0
        };
    });
    
    const topPerformer = memberPerformance.reduce((max, member) => 
        member.efficiency > max.efficiency ? member : max, { efficiency: 0 });
    
    updateIndicator('topPerformer', topPerformer.name || 'N/A');
    updateIndicator('avgTasksPerMember', Math.round(teamTasks.length / teamMembers.length) || 0);
    updateIndicator('teamEfficiency', Math.round((completedCount / teamTasks.length) * 100) || 0);
    
    // Activity indicators
    const last7Days = [];
    const activityData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const activities = teamTasks.filter(t => {
            const taskDate = new Date(t.createdAt);
            return taskDate.toDateString() === date.toDateString();
        }).length;
        activityData.push(activities);
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    const peakDayIndex = activityData.indexOf(Math.max(...activityData));
    const peakDay = last7Days[peakDayIndex] || 'N/A';
    const totalActivities = teamTasks.length;
    const activityTrend = activityData[6] > activityData[0] ? 'Increasing' : 'Decreasing';
    
    updateIndicator('peakActivityDay', peakDay);
    updateIndicator('totalActivities', totalActivities);
    updateIndicator('activityTrend', activityTrend);
    
    // Completion trend indicators
    const completionRate = teamTasks.length > 0 ? Math.round((completedCount / teamTasks.length) * 100) : 0;
    const avgCompletionTime = calculateAverageCompletionTime(teamTasks);
    const overdueTasks = teamTasks.filter(t => {
        if (t.dueDate && t.status !== 'completed') {
            return new Date(t.dueDate) < new Date();
        }
        return false;
    }).length;
    
    updateIndicator('completionRate', completionRate + '%');
    updateIndicator('avgCompletionTime', avgCompletionTime);
    updateIndicator('overdueTasks', overdueTasks);
    
    // Workload indicators
    const workloadBalance = calculateWorkloadBalance(teamTasks, teamMembers);
    const busiestMember = memberPerformance.reduce((max, member) => 
        member.assigned > max.assigned ? member : max, { assigned: 0 });
    const availableCapacity = Math.max(0, (teamMembers.length * 5) - teamTasks.length);
    
    updateIndicator('workloadBalance', workloadBalance);
    updateIndicator('busiestMember', busiestMember.name || 'N/A');
    updateIndicator('availableCapacity', availableCapacity);
}

// Helper function to update indicator values
function updateIndicator(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Calculate average completion time
function calculateAverageCompletionTime(tasks) {
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.createdAt && t.updatedAt);
    if (completedTasks.length === 0) return 'N/A';
    
    const totalTime = completedTasks.reduce((sum, task) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        return sum + (completed - created);
    }, 0);
    
    const avgTimeMs = totalTime / completedTasks.length;
    const avgTimeHours = avgTimeMs / (1000 * 60 * 60);
    
    if (avgTimeHours < 24) {
        return Math.round(avgTimeHours) + 'h';
    } else {
        return Math.round(avgTimeHours / 24) + 'd';
    }
}

// Calculate workload balance score
function calculateWorkloadBalance(tasks, members) {
    if (members.length === 0) return 'N/A';
    
    const memberWorkloads = members.map(member => {
        return tasks.filter(t => t.assignedTo === member.email).length;
    });
    
    const avgWorkload = memberWorkloads.reduce((sum, load) => sum + load, 0) / memberWorkloads.length;
    const variance = memberWorkloads.reduce((sum, load) => sum + Math.pow(load - avgWorkload, 2), 0) / memberWorkloads.length;
    const standardDeviation = Math.sqrt(variance);
    
    const balanceScore = avgWorkload > 0 ? Math.round((1 - (standardDeviation / avgWorkload)) * 100) : 100;
    
    if (balanceScore >= 80) return 'Excellent';
    if (balanceScore >= 60) return 'Good';
    if (balanceScore >= 40) return 'Fair';
    return 'Poor';
}

// Generate analysis functions for each chart type
function generateTeamStatusAnalysis(teamTasks) {
    const completed = teamTasks.filter(t => t.status === 'completed').length;
    const inProgress = teamTasks.filter(t => t.status === 'in-progress').length;
    const pending = teamTasks.filter(t => t.status === 'pending').length;
    const total = teamTasks.length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const analysis = `Your team has completed ${completionRate}% of all tasks. ${completed} tasks are finished, ${inProgress} are in progress, and ${pending} are pending.`;
    const recommendations = completionRate >= 80 ? 'Excellent progress! Consider setting more challenging goals.' : 
                           completionRate >= 60 ? 'Good progress. Focus on completing pending tasks.' : 
                           'Consider reviewing task priorities and providing additional support.';
    
    updateAnalysisContent('teamStatus', analysis, recommendations);
}

function generateTeamPriorityAnalysis(teamTasks) {
    const high = teamTasks.filter(t => t.priority === 'high').length;
    const medium = teamTasks.filter(t => t.priority === 'medium').length;
    const low = teamTasks.filter(t => t.priority === 'low').length;
    
    const analysis = `Priority distribution: ${high} high priority, ${medium} medium priority, and ${low} low priority tasks.`;
    const recommendations = high > medium + low ? 'High priority tasks dominate. Consider delegating or breaking them down.' : 
                           (medium > low ? 'Good priority balance. Maintain focus on high priority items.' : 
                           'Consider reviewing task priorities to ensure important items are marked as high priority.');
    
    updateAnalysisContent('teamPriority', analysis, recommendations);
}

function generateMemberPerformanceAnalysis(teamTasks, teamMembers) {
    const memberStats = teamMembers.map(member => {
        const assigned = teamTasks.filter(t => t.assignedTo === member.email).length;
        const completed = teamTasks.filter(t => t.assignedTo === member.email && t.status === 'completed').length;
        return { name: member.name || member.displayName || member.email, assigned, completed };
    });
    
    const topPerformer = memberStats.reduce((max, member) => 
        member.completed > max.completed ? member : max, { completed: 0 });
    
    const analysis = `Top performer: ${topPerformer.name} with ${topPerformer.completed} completed tasks.`;
    const recommendations = 'Consider sharing best practices from top performers with the team.';
    
    updateAnalysisContent('memberPerformance', analysis, recommendations);
}

function generateActivityTimelineAnalysis(teamTasks) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date);
    }
    
    const dailyActivity = last7Days.map(date => {
        return teamTasks.filter(t => {
            const taskDate = new Date(t.createdAt);
            return taskDate.toDateString() === date.toDateString();
        }).length;
    });
    
    const peakDay = last7Days[dailyActivity.indexOf(Math.max(...dailyActivity))];
    const peakDayStr = peakDay.toLocaleDateString('en-US', { weekday: 'long' });
    
    const analysis = `Peak activity day: ${peakDayStr} with ${Math.max(...dailyActivity)} tasks created.`;
    const recommendations = 'Consider scheduling important meetings and deadlines on peak activity days.';
    
    updateAnalysisContent('activityTimeline', analysis, recommendations);
}

function generateCompletionTrendAnalysis(teamTasks) {
    const completed = teamTasks.filter(t => t.status === 'completed').length;
    const total = teamTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const analysis = `Overall completion rate: ${completionRate}%. ${completed} out of ${total} tasks completed.`;
    const recommendations = completionRate >= 80 ? 'Excellent completion rate! Keep up the momentum.' : 
                           completionRate >= 60 ? 'Good progress. Focus on completing remaining tasks.' : 
                           'Consider reviewing task complexity and providing additional resources.';
    
    updateAnalysisContent('completionTrend', analysis, recommendations);
}

function generateWorkloadDistributionAnalysis(teamTasks, teamMembers) {
    const memberWorkloads = teamMembers.map(member => {
        const tasks = teamTasks.filter(t => t.assignedTo === member.email).length;
        return { name: member.name || member.displayName || member.email, tasks };
    });
    
    const busiestMember = memberWorkloads.reduce((max, member) => 
        member.tasks > max.tasks ? member : max, { tasks: 0 });
    
    const analysis = `Busiest team member: ${busiestMember.name} with ${busiestMember.tasks} tasks assigned.`;
    const recommendations = 'Consider redistributing tasks to balance workload across the team.';
    
    updateAnalysisContent('workloadDistribution', analysis, recommendations);
}

// Update analysis content in the UI
function updateAnalysisContent(chartType, analysis, recommendations) {
    const analysisElement = document.getElementById(chartType + 'Analysis');
    const recommendationsElement = document.getElementById(chartType + 'Recommendations');
    
    if (analysisElement) {
        analysisElement.textContent = analysis;
    }
    if (recommendationsElement) {
        recommendationsElement.textContent = recommendations;
    }
}

// Export chart data functionality
function exportChartData(chartType) {
    const teamCharts = getTeamCharts();
    const teamTasks = getTeamTasks();
    const teamMembers = getTeamMembers();
    
    let chartData = {};
    let fileName = '';
    
    switch (chartType) {
        case 'teamStatus':
            const completed = teamTasks.filter(t => t.status === 'completed').length;
            const inProgress = teamTasks.filter(t => t.status === 'in-progress').length;
            const pending = teamTasks.filter(t => t.status === 'pending').length;
            
            chartData = {
                labels: ['Completed', 'In Progress', 'Pending'],
                data: [completed, inProgress, pending],
                total: teamTasks.length
            };
            fileName = 'team-status-distribution';
            break;
            
        case 'teamPriority':
            const high = teamTasks.filter(t => t.priority === 'high').length;
            const medium = teamTasks.filter(t => t.priority === 'medium').length;
            const low = teamTasks.filter(t => t.priority === 'low').length;
            
            chartData = {
                labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                data: [high, medium, low],
                total: teamTasks.length
            };
            fileName = 'team-priority-distribution';
            break;
            
        case 'memberPerformance':
            const memberStats = teamMembers.map(member => {
                const assigned = teamTasks.filter(t => t.assignedTo === member.email).length;
                const completed = teamTasks.filter(t => t.assignedTo === member.email && t.status === 'completed').length;
                return {
                    name: member.name || member.displayName || member.email,
                    assigned,
                    completed,
                    efficiency: assigned > 0 ? Math.round((completed / assigned) * 100) : 0
                };
            });
            
            chartData = {
                members: memberStats,
                total: teamTasks.length
            };
            fileName = 'member-performance';
            break;
            
        case 'activityTimeline':
            const last7Days = [];
            const createdData = [];
            const completedData = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                last7Days.push(dateStr);
                
                const created = teamTasks.filter(t => {
                    const taskDate = new Date(t.createdAt);
                    return taskDate.toDateString() === date.toDateString();
                }).length;
                
                const completed = teamTasks.filter(t => {
                    if (t.status === 'completed' && t.updatedAt) {
                        const taskDate = new Date(t.updatedAt);
                        return taskDate.toDateString() === date.toDateString();
                    }
                    return false;
                }).length;
                
                createdData.push(created);
                completedData.push(completed);
            }
            
            chartData = {
                dates: last7Days,
                created: createdData,
                completed: completedData
            };
            fileName = 'activity-timeline';
            break;
            
        case 'completionTrend':
            const completionRates = [];
            const trendDates = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                trendDates.push(dateStr);
                
                const tasksForDay = teamTasks.filter(t => {
                    const taskDate = new Date(t.createdAt);
                    return taskDate.toDateString() === date.toDateString();
                });
                
                const completedForDay = tasksForDay.filter(t => t.status === 'completed').length;
                const completionRate = tasksForDay.length > 0 ? (completedForDay / tasksForDay.length) * 100 : 0;
                completionRates.push(Math.round(completionRate));
            }
            
            chartData = {
                dates: trendDates,
                completionRates: completionRates,
                averageRate: Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length)
            };
            fileName = 'completion-trend';
            break;
            
        case 'workloadDistribution':
            const workloadData = teamMembers.map(member => {
                const assignedTasks = teamTasks.filter(t => t.assignedTo === member.email).length;
                return {
                    name: member.name || member.displayName || member.email,
                    tasks: assignedTasks
                };
            });
            
            chartData = {
                members: workloadData,
                total: teamTasks.length,
                average: Math.round(teamTasks.length / teamMembers.length)
            };
            fileName = 'workload-distribution';
            break;
    }
    
    // Create and download the JSON file
    const dataStr = JSON.stringify(chartData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show success message
    showAlert(`Chart data exported successfully as ${fileName}.json`, 'success');
}

// Setup real-time listeners
function setupRealtimeListeners() {
    const currentTeam = getCurrentTeam();
    const teamTasks = getTeamTasks();
    
    // Listen for new team tasks
    firebase.firestore()
        .collection('tasks')
        .doc(currentTeam)
        .collection('teamTasks')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    teamTasks.unshift({
                        id: change.doc.id,
                        ...change.doc.data()
                    });
                } else if (change.type === 'modified') {
                    const index = teamTasks.findIndex(t => t.id === change.doc.id);
                    if (index !== -1) {
                        teamTasks[index] = {
                            id: change.doc.id,
                            ...change.doc.data()
                        };
                    }
                } else if (change.type === 'removed') {
                    const index = teamTasks.findIndex(t => t.id === change.doc.id);
                    if (index !== -1) {
                        teamTasks.splice(index, 1);
                    }
                }
            });
            
            updateTaskStatistics();
        });
}

// Update dashboard
function updateDashboard() {
    console.log('Updating dashboard...');
    updateTeamTasksDisplay();
    updateTeamMembersDisplay();
    updateTaskStatistics();
    updateCharts(); // Make sure charts are updated
    
    // Add global debugging functions
    window.debugTeamDashboard = () => {
        console.log('=== TEAM DASHBOARD DEBUG ===');
        console.log('Current user:', getCurrentUser());
        console.log('Current team:', getCurrentTeam());
        console.log('Is premium user:', getIsPremiumUser());
        console.log('Team tasks count:', getTeamTasks().length);
        console.log('Team members count:', getTeamMembers().length);
        console.log('Team tasks:', getTeamTasks());
        console.log('Team members:', getTeamMembers());
        console.log('Team charts:', getTeamCharts());
    };
    
    window.refreshTeamDashboard = async () => {
        console.log('Refreshing team dashboard...');
        await loadTeamData();
        updateDashboard();
        console.log('Dashboard refreshed!');
    };
    
    window.debugCharts = () => {
        console.log('=== CHART DEBUG ===');
        const teamCharts = getTeamCharts();
        console.log('Available charts:', Object.keys(teamCharts));
        console.log('Chart objects:', teamCharts);
        
        // Check if canvas elements exist
        const canvasIds = ['teamStatusChart', 'teamPriorityChart', 'memberPerformanceChart', 'activityTimelineChart'];
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            console.log(`Canvas ${id}:`, canvas ? 'Found' : 'Not found');
        });
        
        // Debug member performance chart specifically
        if (teamCharts.memberChart) {
            console.log('Member chart data:', {
                labels: teamCharts.memberChart.data.labels,
                datasets: teamCharts.memberChart.data.datasets
            });
        }
    };
    
    window.testMemberChart = () => {
        console.log('=== TESTING MEMBER CHART ===');
        const teamCharts = getTeamCharts();
        const teamMembers = getTeamMembers();
        const teamTasks = getTeamTasks();
        
        console.log('Team members:', teamMembers);
        console.log('Team tasks:', teamTasks);
        
        // Test with sample data
        if (teamCharts.memberChart) {
            const testLabels = ['John Doe', 'Jane Smith', 'Bob Johnson'];
            const testData = [5, 3, 2];
            
            teamCharts.memberChart.data.labels = testLabels;
            teamCharts.memberChart.data.datasets[0].data = testData;
            teamCharts.memberChart.update();
            
            console.log('Test data applied to member chart');
        }
    };
    
    console.log('Debug commands available:');
    console.log('- debugTeamDashboard() - Show all dashboard data');
    console.log('- refreshTeamDashboard() - Force refresh dashboard');
    console.log('- debugCharts() - Show chart debugging info');
    console.log('- testMemberChart() - Test member chart with sample data');
}

// Debug function to show current team info
function debugTeamInfo() {
    console.log('=== TEAM DASHBOARD DEBUG INFO ===');
    console.log('Current Team ID:', getCurrentTeam());
    console.log('Current User:', getCurrentUser() ? getCurrentUser().uid : 'Not logged in');
    console.log('Team Members:', getTeamMembers());
    console.log('Team Tasks:', getTeamTasks());
    console.log('Is Premium User:', getIsPremiumUser());
    
    // Show alert with debug info
    const debugInfo = `
        Team ID: ${getCurrentTeam() || 'Not set'}
        User ID: ${getCurrentUser() ? getCurrentUser().uid : 'Not logged in'}
        Team Members: ${getTeamMembers().length}
        Team Tasks: ${getTeamTasks().length}
        Premium: ${getIsPremiumUser() ? 'Yes' : 'No'}
    `;
    
    showAlert(`Debug Info: ${debugInfo}`, 'info');
}

// Manual refresh function
async function manualRefresh() {
    try {
        console.log('Manual refresh triggered...');
        
        // Show loading state
        const statusIndicator = document.getElementById('teamTasksStatus');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-secondary me-2';
            statusIndicator.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Refreshing...';
        }
        
        // Clear existing data to force fresh load
        setTeamTasks([]);
        setTeamMembers([]);
        
        // Reload team data with cache busting
        await loadTeamData();
        
        // Force reload team tasks specifically
        await loadTeamTasks();
        
        // Update all displays
        updateTeamTasksDisplay();
        updateTeamMembersDisplay();
        updateTaskStatistics();
        updateCharts();
        
        // Update status indicator
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-success me-2';
            statusIndicator.innerHTML = `<i class="bi bi-check-circle me-1"></i>${getTeamTasks().length} Tasks`;
        }
        
        console.log('Manual refresh completed successfully');
        showAlert('Team dashboard refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Error during manual refresh:', error);
        showAlert('Error refreshing data. Please try again.', 'danger');
        
        // Reset status indicator on error
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-danger me-2';
            statusIndicator.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Error';
        }
    }
}

// Create sample team tasks function (global)
window.createSampleTeamTasks = async function() {
    try {
        console.log('Creating sample team tasks...');
        
        // Show loading state
        const statusIndicator = document.getElementById('teamTasksStatus');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-secondary me-2';
            statusIndicator.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Creating...';
        }
        
        await createSampleTeamTasksIfNeeded();
        
        console.log('Sample team tasks created successfully!');
        showAlert('Sample team tasks created successfully!', 'success');
        
    } catch (error) {
        console.error('Error creating sample team tasks:', error);
        showAlert('Error creating sample team tasks. Please try again.', 'danger');
    }
};

// Show no team message
function showNoTeamMessage() {
    const dashboardContainer = document.querySelector('.main-content');
    if (dashboardContainer) {
        dashboardContainer.innerHTML = `
            <div class="container">
                <div class="text-center py-5">
                    <i class="fas fa-users text-muted" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">No Team Found</h3>
                    <p class="text-muted">You don't have access to any team dashboard or there was an error loading your team.</p>
                    <div class="d-flex justify-content-center gap-3 mb-4">
                        <button class="btn btn-primary" onclick="createDefaultTeamAndRefresh()">
                            <i class="fas fa-plus-circle me-2"></i>Create New Team
                        </button>
                        <a href="team.html" class="btn btn-outline-primary">
                            <i class="fas fa-users me-2"></i>Go to Teams
                        </a>
                        <button class="btn btn-outline-info" onclick="debugTeamInfo()">
                            <i class="fas fa-bug me-2"></i>Debug Info
                        </button>
                    </div>
                    <div class="mt-4">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            If you're expecting to see a team, try refreshing the page or contact your team administrator.
                        </small>
                    </div>
                </div>
            </div>
        `;
    }
}

// Show premium required message
function showPremiumRequiredMessage() {
    const dashboardContainer = document.querySelector('.main-content');
    if (dashboardContainer) {
        dashboardContainer.innerHTML = `
            <div class="container">
                <div class="text-center py-5">
                    <i class="fas fa-crown text-warning" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">Premium Feature</h3>
                    <p class="text-muted">Team dashboard is a premium feature. Please upgrade to access team analytics.</p>
                    <a href="premium.html" class="btn btn-warning">
                        <i class="fas fa-crown me-2"></i>Upgrade to Premium
                    </a>
                </div>
            </div>
        `;
    }
}

// Show team dashboard content
function showTeamDashboard() {
    console.log('Showing team dashboard content...');
    
    // Hide loading spinner
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    
    // Show team info section
    const teamInfoSection = document.getElementById('teamInfoSection');
    if (teamInfoSection) {
        teamInfoSection.style.display = 'block';
    }
    
    // Update team code display
    const teamCodeElement = document.getElementById('teamCode');
    if (teamCodeElement) {
        teamCodeElement.textContent = getCurrentTeam() || 'No team found';
    }
    
    console.log('Team dashboard content displayed');
}

// Show login required message
function showLoginRequiredMessage() {
    const dashboardContainer = document.querySelector('.main-content');
    if (dashboardContainer) {
        dashboardContainer.innerHTML = `
            <div class="container">
                <div class="text-center py-5">
                    <i class="fas fa-user-times text-muted" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">Login Required</h3>
                    <p class="text-muted">Please log in to access the team dashboard.</p>
                    <a href="login.html" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt me-2"></i>Login
                    </a>
                </div>
            </div>
        `;
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alertsContainer');
    
    if (!alertsContainer) {
        console.warn('Alerts container not found, cannot show alert:', message);
        return;
    }
    
    const alertId = 'alert-' + Date.now();
    const icon = getAlertIcon(type);
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" id="${alertId}" role="alert">
            <div class="d-flex align-items-center">
                <i class="${icon} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertsContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Get alert icon based on type
function getAlertIcon(type) {
    switch (type) {
        case 'success':
            return 'fas fa-check-circle';
        case 'danger':
            return 'fas fa-exclamation-triangle';
        case 'warning':
            return 'fas fa-exclamation-circle';
        case 'info':
        default:
            return 'fas fa-info-circle';
    }
}

// Export functions for use in other scripts
window.teamDashboardFunctions = {
    initializeTeamDashboard,
    loadTeamData,
    updateDashboard,
    updateCharts
};

// Add global functions for manual testing
window.refreshTeamDashboard = function() {
    console.log('[Manual] Refreshing team dashboard...');
    manualRefresh();
};

window.debugTeamInfo = function() {
    console.log('[Manual] Debug team info:');
    console.log('- Current User:', getCurrentUser());
    console.log('- Current Team:', getCurrentTeam());
    console.log('- Team Tasks Count:', getTeamTasks().length);
    console.log('- Team Members Count:', getTeamMembers().length);
    console.log('- Is Premium User:', getIsPremiumUser());
    
    // Show detailed task info
    console.log('- Team Tasks Details:', getTeamTasks());
    console.log('- Team Members Details:', getTeamMembers());
    
    // Check Firebase connection
    if (typeof firebase !== 'undefined') {
        console.log('- Firebase Auth State:', firebase.auth().currentUser);
        console.log('- Firestore Available:', !!firebase.firestore);
    } else {
        console.log('- Firebase not loaded');
    }
};

// Add function to create default team and refresh
window.createDefaultTeamAndRefresh = function() {
    console.log('[Manual] Creating default team and refreshing...');
    createDefaultTeamAndRefresh();
};

// Add function to force load team dashboard
window.forceLoadTeamDashboard = function() {
    console.log('[Manual] Force loading team dashboard...');
    initializeTeamDashboard();
};

// Add function to retry loading team data
window.retryLoadTeamData = async function() {
    console.log('[Manual] Retrying to load team data...');
    try {
        showAlert('Retrying to load team data...', 'info');
        await loadTeamData(true); // Force retry
        showAlert('Team data loaded successfully!', 'success');
        updateDashboard();
    } catch (error) {
        console.error('Error retrying team data load:', error);
        showAlert('Failed to load team data. Please try again.', 'danger');
    }
};

// Add function to check team accessibility
window.checkTeamAccessibility = async function() {
    console.log('[Manual] Checking team accessibility...');
    try {
        const currentTeamId = getCurrentTeam();
        if (!currentTeamId) {
            showAlert('No team ID available. Creating a new team...', 'warning');
            await createDefaultTeamAndRefresh();
            return;
        }
        
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(currentTeamId)
            .get();
        
        if (teamDoc.exists) {
            const teamData = teamDoc.data();
            const currentUser = getCurrentUser();
            
            if (teamData.members && teamData.members.includes(currentUser.uid)) {
                showAlert('Team is accessible and you have proper permissions.', 'success');
            } else {
                showAlert('Team exists but you may not have access. Creating a new team...', 'warning');
                await createDefaultTeamAndRefresh();
            }
        } else {
            showAlert('Team does not exist. Creating a new team...', 'warning');
            await createDefaultTeamAndRefresh();
        }
    } catch (error) {
        console.error('Error checking team accessibility:', error);
        showAlert('Error checking team accessibility. Please try again.', 'danger');
    }
};

// Add function to create sample team tasks
window.createSampleTeamTasks = function() {
    console.log('[Manual] Creating sample team tasks...');
    createSampleTeamTasksIfNeeded().then(() => {
        showAlert('Sample team tasks created successfully!', 'success');
        updateDashboard();
    }).catch(error => {
        console.error('Error creating sample tasks:', error);
        showAlert('Error creating sample tasks. Please try again.', 'danger');
    });
};

// Add function to check latest data from Firebase
window.checkLatestData = async function() {
    try {
        console.log('[Manual] Checking latest data from Firebase...');
        
        const currentTeam = getCurrentTeam();
        if (!currentTeam) {
            console.log('No current team found');
            return;
        }
        
        // Check team document
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(currentTeam)
            .get();
        
        console.log('Team document exists:', teamDoc.exists);
        if (teamDoc.exists) {
            console.log('Team data:', teamDoc.data());
        }
        
        // Check tasks collection
        const tasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .limit(10)
            .get();
        
        console.log('Total tasks in collection:', tasksSnapshot.size);
        tasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            console.log(`Task ${doc.id}:`, {
                title: taskData.title,
                status: taskData.status,
                teamId: taskData.teamId,
                taskType: taskData.taskType,
                teamAssignment: taskData.teamAssignment,
                assignedTo: taskData.assignedTo
            });
        });
        
        // Check for team-specific tasks
        const teamTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamId', '==', currentTeam)
            .get();
        
        console.log('Team-specific tasks:', teamTasksSnapshot.size);
        
    } catch (error) {
        console.error('Error checking latest data:', error);
    }
};

// Log available functions
console.log('[Team Dashboard] Available manual functions:');
console.log('- window.refreshTeamDashboard() - Refresh team dashboard');
console.log('- window.debugTeamInfo() - Debug team information');
console.log('- window.checkLatestData() - Check latest data from Firebase');
console.log('- window.forceLoadTeamDashboard() - Force load dashboard');
console.log('- window.manualRefresh() - Manual refresh with cache clearing');

// Force load team dashboard data (for testing)
window.forceLoadTeamDashboard = async function() {
    try {
        console.log('Force loading team dashboard...');
        
        // Show loading state
        const statusIndicator = document.getElementById('teamTasksStatus');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-secondary me-2';
            statusIndicator.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Force Loading...';
        }
        
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('No user authenticated, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('User authenticated:', user.email);
        setCurrentUser(user);
        
        // Set premium status for development
        setIsPremiumUser(true);
        
        // Clear all existing data
        setTeamTasks([]);
        setTeamMembers([]);
        setTeamCharts({});
        
        // Create default team if needed
        await fetchCurrentTeam();
        
        if (!getCurrentTeam()) {
            console.log('Creating default team...');
            await createDefaultTeam();
            await fetchCurrentTeam();
        }
        
        console.log('Current team ID:', getCurrentTeam());
        
        // Load team data
        await loadTeamData();
        
        // Force create sample tasks (even if some exist)
        console.log('Force creating sample team tasks...');
        await createSampleTeamTasksIfNeeded();
        
        // Reload team data to get the new tasks
        await loadTeamData();
        
        // Force reload team tasks specifically
        await loadTeamTasks();
        
        // Initialize charts
        initializeCharts();
        
        // Update dashboard
        updateDashboard();
        
        // Show dashboard
        showTeamDashboard();
        
        // Update status indicator
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-success me-2';
            statusIndicator.innerHTML = `<i class="bi bi-check-circle me-1"></i>${getTeamTasks().length} Tasks`;
        }
        
        console.log('Team dashboard loaded successfully!');
        showAlert('Team dashboard force loaded successfully!', 'success');
        
        // Debug info
        console.log('Final state:');
        console.log('- Team ID:', getCurrentTeam());
        console.log('- Team Tasks:', getTeamTasks().length);
        console.log('- Team Members:', getTeamMembers().length);
        console.log('- Is Premium:', getIsPremiumUser());
        
    } catch (error) {
        console.error('Error force loading team dashboard:', error);
        showAlert('Error loading team dashboard: ' + error.message, 'danger');
        
        // Reset status indicator on error
        const statusIndicator = document.getElementById('teamTasksStatus');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-danger me-2';
            statusIndicator.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Error';
        }
    }
};

// Add missing functions referenced in HTML
window.generateTeamDigest = async function() {
    try {
        console.log('Generating team digest...');
        const digestContent = document.getElementById('digestContent');
        if (digestContent) {
            digestContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Generating...</span>
                    </div>
                    <p class="text-muted mt-2">Generating team digest...</p>
                </div>
            `;
        }
        
        // Simulate digest generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const teamTasks = getTeamTasks();
        const teamMembers = getTeamMembers();
        const completedTasks = teamTasks.filter(t => t.status === 'completed').length;
        const totalTasks = teamTasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const digestHTML = `
            <div class="team-digest">
                <h6>Team Performance Summary</h6>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Total Tasks:</strong> ${totalTasks}</p>
                        <p><strong>Completed Tasks:</strong> ${completedTasks}</p>
                        <p><strong>Completion Rate:</strong> ${completionRate}%</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Team Members:</strong> ${teamMembers.length}</p>
                        <p><strong>Active Projects:</strong> ${teamTasks.filter(t => t.status === 'in-progress').length}</p>
                        <p><strong>Pending Tasks:</strong> ${teamTasks.filter(t => t.status === 'pending').length}</p>
                    </div>
                </div>
                <hr>
                <h6>Recent Activity</h6>
                <ul class="list-unstyled">
                    ${teamTasks.slice(0, 5).map(task => `
                        <li class="mb-2">
                            <i class="bi bi-check-circle text-success me-2"></i>
                            ${task.title} - ${task.status}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        if (digestContent) {
            digestContent.innerHTML = digestHTML;
        }
        
        showAlert('Team digest generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating team digest:', error);
        showAlert('Error generating team digest. Please try again.', 'danger');
    }
};

window.shareTeamDigest = function() {
    console.log('Sharing team digest...');
    showAlert('Share functionality coming soon!', 'info');
};

window.manageTeam = function() {
    console.log('Opening team management...');
    window.location.href = 'team.html';
};

window.manageTeamMembers = function() {
    console.log('Opening team member management modal...');
    showTeamMemberManagementModal();
};

// Function to show team member management modal
async function showTeamMemberManagementModal() {
    try {
        const currentTeamId = getCurrentTeam();
        if (!currentTeamId) {
            showAlert('No team selected. Please select a team first.', 'warning');
            return;
        }

        // Get team information
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(currentTeamId)
            .get();

        if (!teamDoc.exists) {
            showAlert('Team not found.', 'danger');
            return;
        }

        const teamData = teamDoc.data();
        const currentUser = getCurrentUser();
        const isOwner = teamData.createdBy === currentUser.uid;

        if (!isOwner) {
            showAlert('Only team owners can manage members.', 'warning');
            return;
        }

        // Update modal title
        document.getElementById('teamMemberManagementModalLabel').innerHTML = `
            <i class="fas fa-users me-2"></i>Manage Members - ${teamData.name}
        `;

        // Load team information
        const teamInfoHTML = `
            <div class="mb-3">
                <strong>Name:</strong> ${teamData.name}
            </div>
            <div class="mb-3">
                <strong>Description:</strong> ${teamData.description || 'No description'}
            </div>
            <div class="mb-3">
                <strong>Type:</strong> <span class="badge bg-primary">${teamData.type || 'General'}</span>
            </div>
            <div class="mb-3">
                <strong>Members:</strong> ${teamData.members ? teamData.members.length : 0} members
            </div>
            ${teamData.code ? `
                <div class="mb-3">
                    <strong>Invitation Code:</strong> 
                    <span class="badge bg-secondary">${teamData.code}</span>
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyInvitationCode('${teamData.code}', '${teamData.name}')">
                        <i class="fas fa-copy me-1"></i>Copy
                    </button>
                </div>
            ` : ''}
        `;

        document.getElementById('teamInfoForManagement').innerHTML = teamInfoHTML;

        // Load team members with remove functionality
        const membersHTML = await generateMemberListForManagement(teamData.members || [], currentTeamId, isOwner, teamData.createdBy);
        document.getElementById('teamMembersForManagement').innerHTML = `
            <ul class="list-unstyled">
                ${membersHTML}
            </ul>
        `;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('teamMemberManagementModal'));
        modal.show();

    } catch (error) {
        console.error('Error showing team member management modal:', error);
        showAlert('Error loading team member management. Please try again.', 'danger');
    }
}

// Function to generate member list for management modal
async function generateMemberListForManagement(memberIds, teamId, isTeamOwner, teamCreatorId) {
    try {
        console.log('Generating member list for management:', memberIds, 'Team ID:', teamId, 'Is Owner:', isTeamOwner, 'Team Creator:', teamCreatorId);
        let memberHTML = '';
        
        if (!memberIds || memberIds.length === 0) {
            return '<li class="text-muted">No members found</li>';
        }
        
        for (const memberId of memberIds) {
            try {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(memberId)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const isCurrentUser = memberId === getCurrentUser().uid;
                    const isTeamCreator = memberId === teamCreatorId;
                    const displayName = userData.displayName || userData.email.split('@')[0];
                    
                    // Determine role badge - only team creator is admin, rest are members
                    let roleBadge = '';
                    if (isTeamCreator) {
                        roleBadge = '<span class="badge bg-primary"><i class="fas fa-crown me-1"></i>Admin</span>';
                    } else {
                        roleBadge = '<span class="badge bg-secondary">Member</span>';
                    }
                    
                    // Add remove button for team owners (but not for themselves)
                    let removeButton = '';
                    if (isTeamOwner && !isCurrentUser && teamId) {
                        removeButton = `
                            <button class="btn btn-sm btn-outline-danger ms-2" 
                                    onclick="removeUserFromTeam('${teamId}', '${memberId}', '${displayName}')" 
                                    title="Remove ${displayName} from team">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        `;
                    }
                    
                    memberHTML += `
                        <li class="member-item d-flex align-items-center justify-content-between p-2 border-bottom">
                            <div class="d-flex align-items-center">
                                <div class="member-avatar me-2" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                                    ${displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div class="fw-semibold" style="font-size: 0.9rem;">
                                        ${displayName}
                                        ${isCurrentUser ? '<span class="badge bg-info ms-1" style="font-size: 0.7rem;">You</span>' : ''}
                                    </div>
                                    <small class="text-muted" style="font-size: 0.8rem;">${userData.email}</small>
                                </div>
                            </div>
                            <div class="d-flex align-items-center">
                                ${roleBadge}
                                ${removeButton}
                            </div>
                        </li>
                    `;
                } else {
                    console.log('User document not found for ID:', memberId);
                    // Add placeholder for missing user
                    memberHTML += `
                        <li class="member-item d-flex align-items-center justify-content-between p-2 border-bottom">
                            <div class="d-flex align-items-center">
                                <div class="member-avatar me-2" style="width: 32px; height: 32px; border-radius: 50%; background: var(--secondary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                                    ?
                                </div>
                                <div>
                                    <div class="fw-semibold" style="font-size: 0.9rem;">Unknown User</div>
                                    <small class="text-muted" style="font-size: 0.8rem;">User ID: ${memberId}</small>
                                </div>
                            </div>
                            <span class="badge bg-secondary">Member</span>
                        </li>
                    `;
                }
            } catch (memberError) {
                console.error('Error loading member:', memberId, memberError);
                // Add error placeholder
                memberHTML += `
                    <li class="member-item d-flex align-items-center justify-content-between p-2 border-bottom">
                        <div class="d-flex align-items-center">
                            <div class="member-avatar me-2" style="width: 32px; height: 32px; border-radius: 50%; background: var(--danger-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                                !
                            </div>
                            <div>
                                <div class="fw-semibold" style="font-size: 0.9rem;">Error Loading</div>
                                <small class="text-muted" style="font-size: 0.8rem;">User ID: ${memberId}</small>
                            </div>
                            </div>
                        <span class="badge bg-secondary">Member</span>
                    </li>
                `;
            }
        }
        
        return memberHTML || '<li class="text-muted">No members found</li>';
        
    } catch (error) {
        console.error('Error generating member list for management:', error);
        return '<li class="text-muted">Error loading members</li>';
    }
}

// Function to copy invitation code
async function copyInvitationCode(code, teamName) {
    try {
        await navigator.clipboard.writeText(code);
        showAlert('Invitation code copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showAlert('Invitation code copied to clipboard!', 'success');
    }
}

// Function to remove user from team
async function removeUserFromTeam(teamId, userId, userName) {
    try {
        const confirmed = confirm(`Are you sure you want to remove "${userName}" from the team?`);
        if (!confirmed) return;

        // Remove user from team members
        await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .update({
                members: firebase.firestore.FieldValue.arrayRemove(userId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        showAlert(`Successfully removed "${userName}" from the team`, 'success');
        
        // Refresh the modal
        showTeamMemberManagementModal();
        
    } catch (error) {
        console.error('Error removing user from team:', error);
        showAlert('Error removing user from team. Please try again.', 'danger');
    }
}

window.exportChartData = function(chartType) {
    console.log('Exporting chart data:', chartType);
    showAlert(`Exporting ${chartType} data...`, 'info');
    
    // Simulate export
    setTimeout(() => {
        showAlert(`${chartType} data exported successfully!`, 'success');
    }, 1000);
};

// Export new admin team functions
window.refreshAdminTeams = refreshAdminTeams;
window.createNewTeam = createNewTeam;
window.switchToTeam = switchToTeam;
window.loadTasksForTeam = loadTasksForTeam; 