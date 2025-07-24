// Team Management JavaScript

// Global variables - using unique names to avoid conflicts
let teamCurrentUser = null;
let userTeams = [];
let teamInvitations = [];

// Initialize team functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeTeamPage();
});

// Update user welcome message and show user section
function updateUserWelcome(user) {
    try {
        const userSection = document.getElementById('userSection');
        const userWelcome = document.getElementById('userWelcome');
        
        if (userSection && userWelcome) {
            // Show the user section
            userSection.style.display = 'flex';
            
            // Update welcome message
            const displayName = user.displayName || user.email.split('@')[0];
            userWelcome.textContent = `Welcome, ${displayName}`;
            
            console.log('User welcome message updated:', displayName);
        }
    } catch (error) {
        console.error('Error updating user welcome:', error);
    }
}

// Initialize team page
async function initializeTeamPage() {
    try {
        // Check if user is authenticated
        firebase.auth().onAuthStateChanged(async function(user) {
            if (user) {
                teamCurrentUser = user;
                
                // Update user welcome message and show user section
                updateUserWelcome(user);
                
                // Check premium status and admin role
                await checkPremiumStatus();
                
                // Load user's teams
                await loadUserTeams();
                
                // Load team invitations
                await loadTeamInvitations();
                
                // Set up event listeners
                setupEventListeners();
                
            } else {
                showAlert('Please log in to access team features.', 'warning');
                // Redirect to login after a delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        });
        
    } catch (error) {
        console.error('Error initializing team page:', error);
        showAlert('Error initializing team page. Please refresh and try again.', 'danger');
    }
}

// Check premium status and admin role
async function checkPremiumStatus() {
    try {
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(teamCurrentUser.uid)
            .get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const isPremium = userData.premium || userData.role === 'premium';
            let isAdmin = userData.isAdmin || userData.role === 'admin' || userData.isTeamAdmin;
            
            // If not admin from user data, check if user is owner of any teams
            if (!isAdmin) {
                isAdmin = await checkIfUserIsTeamOwner();
            }
            
            if (isPremium) {
                document.body.classList.add('premium-user');
                document.getElementById('premiumBanner').style.display = 'block';
                
                // Show/hide Create New Team section based on admin role
                const createTeamSection = document.getElementById('createTeamSection');
                if (createTeamSection) {
                    if (isAdmin) {
                        createTeamSection.style.display = 'block';
                        console.log('Showing Create Team section for admin user');
                    } else {
                        createTeamSection.style.display = 'none';
                        console.log('Hiding Create Team section for non-admin user');
                    }
                }
            } else {
                document.body.classList.remove('premium-user');
                document.getElementById('premiumBanner').style.display = 'none';
                
                // Hide Create New Team section for non-premium users
                const createTeamSection = document.getElementById('createTeamSection');
                if (createTeamSection) {
                    createTeamSection.style.display = 'none';
                    console.log('Hiding Create Team section for non-premium user');
                }
                
                showAlert('Team collaboration is a premium feature. Please upgrade to access this feature.', 'warning');
            }
        }
        
    } catch (error) {
        console.error('Error checking premium status:', error);
    }
}

// Check if user is owner of any teams
async function checkIfUserIsTeamOwner() {
    try {
        const teamsSnapshot = await firebase.firestore()
            .collection('teams')
            .where('createdBy', '==', teamCurrentUser.uid)
            .limit(1)
            .get();
        
        return !teamsSnapshot.empty;
    } catch (error) {
        console.error('Error checking team ownership:', error);
        return false;
    }
}

// Re-check admin status after loading teams
async function recheckAdminStatus() {
    try {
        // Check if user is owner of any loaded teams
        const isOwnerOfAnyTeam = userTeams.some(team => team.createdBy === teamCurrentUser.uid);
        
        if (isOwnerOfAnyTeam) {
            const createTeamSection = document.getElementById('createTeamSection');
            if (createTeamSection) {
                createTeamSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error rechecking admin status:', error);
    }
}

// Load user's teams
async function loadUserTeams() {
    try {
        console.log('Loading teams for user:', teamCurrentUser.uid);
        
        // First, try with ordering (may fail if index doesn't exist)
        try {
            const teamsSnapshot = await firebase.firestore()
                .collection('teams')
                .where('members', 'array-contains', teamCurrentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            userTeams = [];
            teamsSnapshot.forEach(doc => {
                const teamData = doc.data();
                userTeams.push({
                    id: doc.id,
                    ...teamData,
                    createdAt: teamData.createdAt ? teamData.createdAt.toDate() : new Date(),
                    updatedAt: teamData.updatedAt ? teamData.updatedAt.toDate() : new Date()
                });
            });
            
            console.log('Loaded teams with ordering:', userTeams.length);
            
        } catch (indexError) {
            console.log('Index not available, loading without ordering...');
            
            // Show index instructions to user
            showIndexInstructions();
            
            // Fallback: load without ordering and sort in JavaScript
            const teamsSnapshot = await firebase.firestore()
                .collection('teams')
                .where('members', 'array-contains', teamCurrentUser.uid)
                .get();
            
            userTeams = [];
            teamsSnapshot.forEach(doc => {
                const teamData = doc.data();
                userTeams.push({
                    id: doc.id,
                    ...teamData,
                    createdAt: teamData.createdAt ? teamData.createdAt.toDate() : new Date(),
                    updatedAt: teamData.updatedAt ? teamData.updatedAt.toDate() : new Date()
                });
            });
            
            // Sort by creation date in JavaScript
            userTeams.sort((a, b) => b.createdAt - a.createdAt);
            
            console.log('Loaded teams without ordering:', userTeams.length);
        }
        
        await displayUserTeams();
        
        // Re-check admin status after loading teams (in case user is owner of teams)
        await recheckAdminStatus();
        
    } catch (error) {
        console.error('Error loading user teams:', error);
        showAlert('Error loading teams. Please try again.', 'danger');
        
        // Show fallback message
        const container = document.getElementById('teamsContainer');
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 2.5rem;"></i>
                <p class="text-muted mt-2" style="font-size: 0.85rem;">Unable to load teams. Please check your connection and try again.</p>
                <button class="btn btn-primary btn-sm" onclick="refreshTeams()">
                    <i class="fas fa-sync-alt me-1"></i>Retry
                </button>
            </div>
        `;
    }
}

// Display user teams
async function displayUserTeams() {
    const container = document.getElementById('teamsContainer');
    
    if (userTeams.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users text-muted" style="font-size: 2.5rem;"></i>
                <p class="text-muted mt-2" style="font-size: 0.85rem;">No teams found. Create or join a team to get started.</p>
            </div>
        `;
        return;
    }
    
    // Show loading state
    container.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin text-primary" style="font-size: 2rem;"></i>
            <p class="text-muted mt-2" style="font-size: 0.85rem;">Loading team details...</p>
        </div>
    `;
    
    let teamsHTML = '';
    
    // Process each team to get member details
    for (const team of userTeams) {
        const memberCount = team.members ? team.members.length : 0;
        const isOwner = team.createdBy === teamCurrentUser.uid;
        
        // Get member names for this team
        const memberNames = await getTeamMemberNames(team.members || []);
        
        teamsHTML += `
            <div class="team-item-compact">
                <div class="team-item-header">
                    <div class="team-item-info">
                        <h6><i class="fas fa-users me-2 text-primary"></i>${team.name}</h6>
                        <p class="text-muted mb-2">${team.description || 'No description'}</p>
                        <div class="team-item-meta">
                            <span class="badge badge-primary">
                                <i class="fas fa-tag me-1"></i>${team.type || 'General'}
                            </span>
                            <span class="text-muted">
                                <i class="fas fa-user-friends me-1"></i>${memberCount} members
                            </span>
                            ${isOwner ? '<span class="badge badge-warning"><i class="fas fa-crown me-1"></i>Owner</span>' : ''}
                        </div>
                        <div class="team-invitation-code">
                            <small class="text-muted">
                                <i class="fas fa-key me-1"></i>Invitation Code: 
                                ${team.code ? `
                                    <span class="invitation-code-display">${team.code}</span>
                                    ${isOwner ? `
                                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyInvitationCode('${team.code}', '${team.name}')" title="Copy invitation code">
                                            <i class="fas fa-copy me-1"></i>Copy
                                        </button>
                                    ` : ''}
                                ` : `
                                    <span class="text-warning">No code generated</span>
                                    ${isOwner ? `
                                        <button class="btn btn-sm btn-outline-success ms-2" onclick="regenerateInvitationCode('${team.id}', '${team.name}')" title="Generate invitation code">
                                            <i class="fas fa-plus me-1"></i>Generate Code
                                        </button>
                                    ` : ''}
                                `}
                            </small>
                        </div>
                        <div class="team-members-list">
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>Members: ${memberNames}
                            </small>
                            ${isOwner ? `
                                <div class="mt-2">
                                    <button class="btn btn-outline-danger btn-sm" onclick="showTeamDetails('${team.id}')" title="Manage team members">
                                        <i class="fas fa-user-cog me-1"></i>Manage Members
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="team-item-actions">
                        <button class="btn btn-outline-info btn-sm" onclick="goToTeamDashboard('${team.id}')" title="Go to team dashboard">
                            <i class="fas fa-chart-bar me-1"></i>Dashboard
                        </button>
                        <button class="btn btn-outline-primary btn-sm" onclick="showTeamDetails('${team.id}')" title="View team details">
                            <i class="fas fa-eye me-1"></i>Details
                        </button>
                        ${isOwner ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteTeam('${team.id}', '${team.name}')" title="Delete team and all associated data">
                                <i class="fas fa-trash-alt me-1"></i>Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = teamsHTML;
}

// Get team member names as a formatted string
async function getTeamMemberNames(memberIds) {
    try {
        if (!memberIds || memberIds.length === 0) {
            return 'No members';
        }
        
        const memberNames = [];
        
        for (const memberId of memberIds) {
            try {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(memberId)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const displayName = userData.displayName || userData.email.split('@')[0];
                    const isOwner = memberId === teamCurrentUser.uid;
                    
                    // Add owner indicator for current user
                    if (isOwner) {
                        memberNames.push(`${displayName} (You)`);
                    } else {
                        memberNames.push(displayName);
                    }
                } else {
                    memberNames.push('Unknown User');
                }
            } catch (memberError) {
                console.error('Error loading member:', memberId, memberError);
                memberNames.push('Error Loading');
            }
        }
        
        // Format the names nicely
        if (memberNames.length <= 3) {
            return memberNames.join(', ');
        } else {
            const firstThree = memberNames.slice(0, 3).join(', ');
            const remaining = memberNames.length - 3;
            return `${firstThree} and ${remaining} more`;
        }
        
    } catch (error) {
        console.error('Error getting team member names:', error);
        return 'Error loading members';
    }
}

// Generate member list HTML
async function generateMemberList(memberIds, teamId = null, isTeamOwner = false, teamCreatorId = null) {
    try {
        console.log('Generating member list for IDs:', memberIds, 'Team ID:', teamId, 'Is Owner:', isTeamOwner, 'Team Creator:', teamCreatorId);
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
                    const isCurrentUser = memberId === teamCurrentUser.uid;
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
                    console.log('Added member to list:', userData.email);
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
        
        console.log('Generated member list with', memberIds.length, 'members');
        return memberHTML || '<li class="text-muted">No members found</li>';
        
    } catch (error) {
        console.error('Error generating member list:', error);
        return '<li class="text-muted">Error loading members</li>';
    }
}

// Load team invitations
async function loadTeamInvitations() {
    try {
        const invitationsSnapshot = await firebase.firestore()
            .collection('teamInvitations')
            .where('inviteeId', '==', teamCurrentUser.uid)
            .where('status', '==', 'pending')
            .get();
        
        teamInvitations = [];
        invitationsSnapshot.forEach(doc => {
            teamInvitations.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayTeamInvitations();
        
    } catch (error) {
        console.error('Error loading team invitations:', error);
    }
}

// Display team invitations
function displayTeamInvitations() {
    const section = document.getElementById('invitationsSection');
    const container = document.getElementById('invitationsContainer');
    
    if (teamInvitations.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    let invitationsHTML = '';
    teamInvitations.forEach(invitation => {
        invitationsHTML += `
            <div class="alert alert-info">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <h6 class="mb-1">Invitation to join: ${invitation.teamName}</h6>
                        <p class="mb-0">Invited by: ${invitation.inviterEmail}</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-success btn-sm" onclick="acceptInvitation('${invitation.id}')">
                            <i class="bi bi-check me-1"></i>Accept
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="declineInvitation('${invitation.id}')">
                            <i class="bi bi-x me-1"></i>Decline
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = invitationsHTML;
}

// Set up event listeners
function setupEventListeners() {
    // Create team form
    const createTeamForm = document.getElementById('createTeamForm');
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', handleCreateTeam);
    }
    
    // Join team form
    const joinTeamForm = document.getElementById('joinTeamForm');
    if (joinTeamForm) {
        joinTeamForm.addEventListener('submit', handleJoinTeam);
    }
    
    // Sign out button
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

// Handle sign out
async function handleSignOut() {
    try {
        await firebase.auth().signOut();
        showAlert('Signed out successfully.', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error signing out:', error);
        showAlert('Error signing out. Please try again.', 'danger');
    }
}

// Handle create team form submission
async function handleCreateTeam(event) {
    event.preventDefault();
    
    try {
        const teamName = document.getElementById('teamName').value.trim();
        const teamDescription = document.getElementById('teamDescription').value.trim();
        const teamType = document.getElementById('teamType').value;
        
        if (!teamName) {
            showAlert('Please enter a team name.', 'warning');
            return;
        }
        
        if (!teamType) {
            showAlert('Please select a team type.', 'warning');
            return;
        }
        
        // Generate team code
        const teamCode = generateTeamCode();
        
        // Create team document
        const teamData = {
            name: teamName,
            description: teamDescription,
            type: teamType,
            code: teamCode,
            createdBy: teamCurrentUser.uid,
            members: [teamCurrentUser.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const teamRef = await firebase.firestore()
            .collection('teams')
            .add(teamData);
        
        // Update user profile to set as admin and add teamId
        await firebase.firestore()
            .collection('users')
            .doc(teamCurrentUser.uid)
            .update({
                isAdmin: true,
                teamId: teamRef.id,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Show success message
        showAlert(`Team "${teamName}" created successfully! Team code: ${teamCode}`, 'success');
        
        // Reset form
        document.getElementById('createTeamForm').reset();
        
        // Reload teams
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error creating team:', error);
        showAlert('Error creating team. Please try again.', 'danger');
    }
}

// Handle join team form submission
async function handleJoinTeam(event) {
    event.preventDefault();
    
    try {
        const inviteCode = document.getElementById('inviteCode').value.trim();
        
        if (!inviteCode) {
            showAlert('Please enter an invitation code.', 'warning');
            return;
        }
        
        // Find team by code
        const teamSnapshot = await firebase.firestore()
            .collection('teams')
            .where('code', '==', inviteCode)
            .get();
        
        if (teamSnapshot.empty) {
            showAlert('Invalid invitation code. Please check and try again.', 'warning');
            return;
        }
        
        const teamDoc = teamSnapshot.docs[0];
        const teamData = teamDoc.data();
        
        // Check if user is already a member
        if (teamData.members && teamData.members.includes(teamCurrentUser.uid)) {
            showAlert('You are already a member of this team.', 'info');
            return;
        }
        
        // Add user to team
        await firebase.firestore()
            .collection('teams')
            .doc(teamDoc.id)
            .update({
                members: firebase.firestore.FieldValue.arrayUnion(teamCurrentUser.uid),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Update user profile to add teamId
        await firebase.firestore()
            .collection('users')
            .doc(teamCurrentUser.uid)
            .update({
                teamId: teamDoc.id,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Show success message
        showAlert(`Successfully joined team "${teamData.name}"!`, 'success');
        
        // Reset form
        document.getElementById('joinTeamForm').reset();
        
        // Reload teams
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error joining team:', error);
        showAlert('Error joining team. Please try again.', 'danger');
    }
}

// Accept team invitation
async function acceptInvitation(invitationId) {
    try {
        const invitationDoc = await firebase.firestore()
            .collection('teamInvitations')
            .doc(invitationId)
            .get();
        
        if (!invitationDoc.exists) {
            showAlert('Invitation not found.', 'warning');
            return;
        }
        
        const invitationData = invitationDoc.data();
        
        // Add user to team
        await firebase.firestore()
            .collection('teams')
            .doc(invitationData.teamId)
            .update({
                members: firebase.firestore.FieldValue.arrayUnion(teamCurrentUser.uid),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Update invitation status
        await firebase.firestore()
            .collection('teamInvitations')
            .doc(invitationId)
            .update({
                status: 'accepted',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert('Invitation accepted successfully!', 'success');
        
        // Reload data
        await loadUserTeams();
        await loadTeamInvitations();
        
    } catch (error) {
        console.error('Error accepting invitation:', error);
        showAlert('Error accepting invitation. Please try again.', 'danger');
    }
}

// Decline team invitation
async function declineInvitation(invitationId) {
    try {
        // Update invitation status
        await firebase.firestore()
            .collection('teamInvitations')
            .doc(invitationId)
            .update({
                status: 'declined',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert('Invitation declined.', 'info');
        
        // Reload invitations
        await loadTeamInvitations();
        
    } catch (error) {
        console.error('Error declining invitation:', error);
        showAlert('Error declining invitation. Please try again.', 'danger');
    }
}



// Remove user from team (admin only)
async function removeUserFromTeam(teamId, userId, userName) {
    try {
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .get();
        
        if (!teamDoc.exists) {
            showAlert('Team not found.', 'danger');
            return;
        }
        
        const teamData = teamDoc.data();
        const isOwner = teamData.createdBy === teamCurrentUser.uid;
        
        if (!isOwner) {
            showAlert('Only team owners can remove members.', 'danger');
            return;
        }
        
        // Prevent removing the owner
        if (userId === teamData.createdBy) {
            showAlert('Cannot remove the team owner.', 'warning');
            return;
        }
        
        const confirmed = confirm(`Are you sure you want to remove "${userName}" from the team "${teamData.name}"?`);
        if (!confirmed) return;
        
        // Remove user from team members
        await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .update({
                members: firebase.firestore.FieldValue.arrayRemove(userId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert(`Successfully removed "${userName}" from team "${teamData.name}"`, 'success');
        
        // Reload teams
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error removing user from team:', error);
        showAlert('Error removing user from team. Please try again.', 'danger');
    }
}

// Delete team (admin only)
async function deleteTeam(teamId, teamName) {
    try {
        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .get();
        
        if (!teamDoc.exists) {
            showAlert('Team not found.', 'danger');
            return;
        }
        
        const teamData = teamDoc.data();
        
        // Check if user is the owner/admin
        if (teamData.createdBy !== teamCurrentUser.uid) {
            showAlert('Only team owners can delete teams.', 'danger');
            return;
        }
        
        const confirmed = confirm(`Are you sure you want to delete the team "${teamName}"?\n\nThis action will:\n- Delete the team permanently\n- Remove all team members\n- Delete all associated tasks\n- This action cannot be undone!`);
        if (!confirmed) return;
        
        // Show loading state
        showAlert('Deleting team and cleaning up data...', 'info');
        
        let totalTasksDeleted = 0;
        
        // Delete team tasks with different field structures
        console.log('Deleting team tasks for team ID:', teamId);
        
        // 1. Delete tasks with teamId field
        const teamIdTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamId', '==', teamId)
            .get();
        
        console.log(`Found ${teamIdTasksSnapshot.size} tasks with teamId field`);
        const teamIdTaskDeletionPromises = teamIdTasksSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(teamIdTaskDeletionPromises);
        totalTasksDeleted += teamIdTasksSnapshot.size;
        
        // 2. Delete tasks with teamAssignment.teamId field
        const teamAssignmentTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamAssignment.teamId', '==', teamId)
            .get();
        
        console.log(`Found ${teamAssignmentTasksSnapshot.size} tasks with teamAssignment.teamId field`);
        const teamAssignmentTaskDeletionPromises = teamAssignmentTasksSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(teamAssignmentTaskDeletionPromises);
        totalTasksDeleted += teamAssignmentTasksSnapshot.size;
        
        // 3. Delete tasks with taskType === 'team' and teamId
        const legacyTeamTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('taskType', '==', 'team')
            .get();
        
        // Filter for tasks that belong to this team
        const legacyTeamTasks = legacyTeamTasksSnapshot.docs.filter(doc => {
            const taskData = doc.data();
            return taskData.teamId === teamId;
        });
        
        console.log(`Found ${legacyTeamTasks.length} legacy team tasks`);
        const legacyTaskDeletionPromises = legacyTeamTasks.map(doc => doc.ref.delete());
        await Promise.all(legacyTaskDeletionPromises);
        totalTasksDeleted += legacyTeamTasks.length;
        
        // 4. Delete tasks with teamAssignment.assignedToTeam === true that might belong to this team
        const assignedToTeamTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('teamAssignment.assignedToTeam', '==', true)
            .get();
        
        // Filter for tasks that might belong to this team (check teamName or other indicators)
        const assignedToTeamTasks = assignedToTeamTasksSnapshot.docs.filter(doc => {
            const taskData = doc.data();
            return taskData.teamAssignment && 
                   (taskData.teamAssignment.teamId === teamId || 
                    taskData.teamAssignment.teamName === teamName);
        });
        
        console.log(`Found ${assignedToTeamTasks.length} tasks with assignedToTeam flag`);
        const assignedToTeamTaskDeletionPromises = assignedToTeamTasks.map(doc => doc.ref.delete());
        await Promise.all(assignedToTeamTaskDeletionPromises);
        totalTasksDeleted += assignedToTeamTasks.length;
        
        // 5. Delete team invitations
        const invitationsSnapshot = await firebase.firestore()
            .collection('teamInvitations')
            .where('teamId', '==', teamId)
            .get();
        
        console.log(`Found ${invitationsSnapshot.size} team invitations`);
        const invitationDeletionPromises = invitationsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(invitationDeletionPromises);
        
        // 6. Delete the team document
        await firebase.firestore().collection('teams').doc(teamId).delete();
        
        console.log(`Successfully deleted team "${teamName}" and ${totalTasksDeleted} associated tasks`);
        showAlert(`Team "${teamName}" has been deleted successfully. ${totalTasksDeleted} tasks were also removed.`, 'success');
        
        // Reload teams
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error deleting team:', error);
        showAlert('Error deleting team. Please try again.', 'danger');
    }
}

// Show team details modal
async function showTeamDetails(teamId) {
    try {
        console.log('Showing team details for:', teamId);
        
        const team = userTeams.find(t => t.id === teamId);
        if (!team) {
            showAlert('Team not found.', 'danger');
            return;
        }
        
        const isOwner = team.createdBy === teamCurrentUser.uid;
        
        // Update modal title
        document.getElementById('teamDetailsModalLabel').innerHTML = `
            <i class="fas fa-users me-2"></i>${team.name}
            ${isOwner ? '<span class="badge bg-warning text-dark ms-2"><i class="fas fa-crown me-1"></i>Owner</span>' : ''}
        `;
        
        // Load team information
        const teamInfoHTML = `
            <div class="mb-3">
                <strong>Name:</strong> ${team.name}
            </div>
            <div class="mb-3">
                <strong>Description:</strong> ${team.description || 'No description'}
            </div>
            <div class="mb-3">
                <strong>Type:</strong> <span class="badge bg-primary">${team.type || 'General'}</span>
            </div>
            <div class="mb-3">
                <strong>Created:</strong> ${team.createdAt ? team.createdAt.toLocaleDateString() : 'Unknown'}
            </div>
            <div class="mb-3">
                <strong>Members:</strong> ${team.members ? team.members.length : 0} members
            </div>
            ${team.code ? `
                <div class="mb-3">
                    <strong>Invitation Code:</strong> 
                    <span class="badge bg-secondary">${team.code}</span>
                    ${isOwner ? `
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyInvitationCode('${team.code}', '${team.name}')">
                            <i class="fas fa-copy me-1"></i>Copy
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        `;
        
        document.getElementById('teamInfoDetails').innerHTML = teamInfoHTML;
        
        // Load team members with remove functionality
        const membersHTML = await generateMemberList(team.members || [], team.id, isOwner, team.createdBy);
        document.getElementById('teamMembersDetails').innerHTML = `
            <ul class="list-unstyled">
                ${membersHTML}
            </ul>
        `;
        
        // Show/hide manage button based on ownership
        const manageBtn = document.getElementById('manageTeamBtn');
        if (isOwner) {
            manageBtn.style.display = 'inline-block';
            manageBtn.onclick = () => {
                // Close modal and go to team dashboard for management
                const modal = bootstrap.Modal.getInstance(document.getElementById('teamDetailsModal'));
                modal.hide();
                goToTeamDashboard(teamId);
            };
        } else {
            manageBtn.style.display = 'none';
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('teamDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error showing team details:', error);
        showAlert('Error loading team details. Please try again.', 'danger');
    }
}

// View team details
function viewTeamDetails(teamId) {
    showTeamDetails(teamId);
}

// Manage team (for team owners)
function manageTeam(teamId) {
    goToTeamDashboard(teamId);
}

// Refresh teams
async function refreshTeams() {
    try {
        await loadUserTeams();
        await loadTeamInvitations();
        showAlert('Teams refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing teams:', error);
        showAlert('Error refreshing teams. Please try again.', 'danger');
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

// Copy invitation code to clipboard
async function copyInvitationCode(code, teamName) {
    console.log('Copy button clicked for team:', teamName, 'with code:', code);
    try {
        await navigator.clipboard.writeText(code);
        console.log('Successfully copied to clipboard using modern API');
        showAlert('Copied', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Successfully copied to clipboard using fallback method');
        showAlert('Copied', 'success');
    }
}

// Generate new invitation code for a team
async function regenerateInvitationCode(teamId, teamName) {
    try {
        const newCode = generateTeamCode();
        
        await firebase.firestore()
            .collection('teams')
            .doc(teamId)
            .update({
                code: newCode,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert(`New invitation code generated for "${teamName}": ${newCode}`, 'success');
        
        // Reload teams to show the new code
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error regenerating invitation code:', error);
        showAlert('Error regenerating invitation code. Please try again.', 'danger');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    console.log('Showing alert:', message, 'type:', type);
    const alertsContainer = document.getElementById('alertsContainer');
    
    if (!alertsContainer) {
        console.error('Alerts container not found!');
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
    console.log('Alert HTML set:', alertHTML);
    
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

// Clean up orphaned team tasks (for manual cleanup)
async function cleanupOrphanedTeamTasks(teamId, teamName) {
    try {
        console.log('Cleaning up orphaned tasks for team:', teamId, teamName);
        
        let totalTasksDeleted = 0;
        
        // Get all tasks and filter for orphaned ones
        const allTasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .get();
        
        const orphanedTasks = [];
        
        allTasksSnapshot.forEach(doc => {
            const taskData = doc.data();
            
            // Check if this task belongs to the deleted team
            const isOrphaned = (
                (taskData.teamId === teamId) ||
                (taskData.teamAssignment && taskData.teamAssignment.teamId === teamId) ||
                (taskData.teamAssignment && taskData.teamAssignment.teamName === teamName) ||
                (taskData.taskType === 'team' && taskData.teamId === teamId) ||
                (taskData.assignedTo && taskData.assignedTo.includes(teamName))
            );
            
            if (isOrphaned) {
                orphanedTasks.push(doc);
            }
        });
        
        console.log(`Found ${orphanedTasks.length} orphaned tasks to delete`);
        
        if (orphanedTasks.length > 0) {
            const deletionPromises = orphanedTasks.map(doc => doc.ref.delete());
            await Promise.all(deletionPromises);
            totalTasksDeleted = orphanedTasks.length;
            
            console.log(`Successfully deleted ${totalTasksDeleted} orphaned tasks`);
            showAlert(`Cleaned up ${totalTasksDeleted} orphaned tasks for team "${teamName}"`, 'success');
        } else {
            showAlert('No orphaned tasks found for this team', 'info');
        }
        
        return totalTasksDeleted;
        
    } catch (error) {
        console.error('Error cleaning up orphaned tasks:', error);
        showAlert('Error cleaning up orphaned tasks. Please try again.', 'danger');
        return 0;
    }
}

// Show Firebase index creation instructions
function showIndexInstructions() {
    const instructions = `
        <div class="alert alert-info">
            <div class="d-flex align-items-start">
                <i class="fas fa-cog me-2 mt-1"></i>
                <div>
                    <h6 class="mb-2">Firebase Index Setup Required</h6>
                    <p class="mb-2" style="font-size: 0.85rem;">To enable proper team ordering, you need to create a composite index in Firebase Firestore:</p>
                    <div class="bg-light p-2 rounded" style="font-size: 0.8rem; font-family: monospace;">
                        Collection: teams<br>
                        Fields: members (Array), createdAt (Descending)
                    </div>
                    <p class="mt-2 mb-0" style="font-size: 0.8rem;">
                        <i class="fas fa-info-circle me-1"></i>
                        This will improve team loading performance and enable proper sorting.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    showAlert(instructions, 'info');
}

// Create sample teams for testing
async function createSampleTeams() {
    try {
        const sampleTeams = [
            {
                name: 'Development Team',
                description: 'Core development team for the main project',
                type: 'project',
                code: 'DEV001'
            },
            {
                name: 'Marketing Team',
                description: 'Digital marketing and content creation',
                type: 'department',
                code: 'MKT002'
            },
            {
                name: 'Design Team',
                description: 'UI/UX design and creative assets',
                type: 'cross-functional',
                code: 'DSN003'
            },
            {
                name: 'Code Ninja Team',
                description: 'Elite coding and development team for advanced projects',
                type: 'project',
                code: 'CNJ004'
            }
        ];

        for (const teamData of sampleTeams) {
            // Check if team already exists
            const existingTeam = await firebase.firestore()
                .collection('teams')
                .where('code', '==', teamData.code)
                .get();

            if (existingTeam.empty) {
                const newTeamData = {
                    ...teamData,
                    createdBy: teamCurrentUser.uid,
                    members: [teamCurrentUser.uid],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await firebase.firestore()
                    .collection('teams')
                    .add(newTeamData);

                console.log(`Created sample team: ${teamData.name}`);
            }
        }

        showAlert('Sample teams created successfully!', 'success');
        await loadUserTeams();

    } catch (error) {
        console.error('Error creating sample teams:', error);
        showAlert('Error creating sample teams. Please try again.', 'danger');
    }
}

// Delete all sample teams and their tasks
async function deleteAllSampleTeams() {
    try {
        console.log('Starting deletion of all sample teams...');
        
        // Sample team identifiers
        const sampleTeamNames = [
            'Development Team',
            'Marketing Team', 
            'Design Team',
            'Code Ninja Team'
        ];
        
        const sampleTeamCodes = ['DEV001', 'MKT002', 'DSN003', 'CNJ004'];
        
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
        
        // Refresh the teams display
        await loadUserTeams();
        
    } catch (error) {
        console.error('Error deleting sample teams:', error);
        showAlert('Error deleting sample teams. Please try again.', 'danger');
    }
}

// Export functions for global access
window.teamManagement = {
    refreshTeams,
    viewTeamDetails,
    manageTeam,
    acceptInvitation,
    declineInvitation,
    createSampleTeams,
    deleteAllSampleTeams,
    deleteTeam,
    cleanupOrphanedTeamTasks
};

// Add manual cleanup function for orphaned tasks
window.cleanupCodeNinjaTasks = async () => {
    console.log('Manual cleanup for Code Ninja Team tasks...');
    
    // Try to find the actual team ID for Code Ninja Team
    const teamsSnapshot = await firebase.firestore()
        .collection('teams')
        .where('name', '==', 'Code Ninja Team')
        .get();
    
    let teamId = 'code-ninja-team'; // Default fallback
    if (!teamsSnapshot.empty) {
        teamId = teamsSnapshot.docs[0].id;
    }
    
    const teamName = 'Code Ninja Team';
    
    const confirmed = confirm(`Are you sure you want to clean up orphaned tasks for "${teamName}"?\n\nThis will search for and delete any remaining tasks that belong to this team.`);
    if (confirmed) {
        const deletedCount = await cleanupOrphanedTeamTasks(teamId, teamName);
        console.log(`Cleanup completed. Deleted ${deletedCount} tasks.`);
        
        // Also try to delete any remaining team document
        try {
            const teamDoc = await firebase.firestore()
                .collection('teams')
                .doc(teamId)
                .get();
            
            if (teamDoc.exists) {
                await teamDoc.ref.delete();
                console.log('Deleted remaining team document');
            }
        } catch (error) {
            console.log('No team document to delete or error:', error);
        }
    }
};

// Specific function to delete Code Ninja Team
window.deleteCodeNinjaTeam = async function() {
    try {
        // Find the Code Ninja Team
        const teamsSnapshot = await firebase.firestore()
            .collection('teams')
            .where('name', '==', 'Code Ninja Team')
            .get();
        
        if (teamsSnapshot.empty) {
            showAlert('Code Ninja Team not found.', 'warning');
            return;
        }
        
        const teamDoc = teamsSnapshot.docs[0];
        const teamData = teamDoc.data();
        
        // Check if user is the owner
        if (teamData.createdBy !== teamCurrentUser.uid) {
            showAlert('Only the team owner can delete the Code Ninja Team.', 'danger');
            return;
        }
        
        // Use the existing deleteTeam function
        await deleteTeam(teamDoc.id, 'Code Ninja Team');
        
    } catch (error) {
        console.error('Error deleting Code Ninja Team:', error);
        showAlert('Error deleting Code Ninja Team. Please try again.', 'danger');
    }
};

// Hero section button functions
function scrollToCreateTeam() {
    const createTeamSection = document.querySelector('#createTeamForm');
    if (createTeamSection) {
        createTeamSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        // Focus on the team name input
        setTimeout(() => {
            const teamNameInput = document.getElementById('teamName');
            if (teamNameInput) {
                teamNameInput.focus();
            }
        }, 500);
    }
}

function goToTaskAssignment() {
    // Check if user has teams
    if (userTeams && userTeams.length > 0) {
        // Navigate to task page with team context
        window.location.href = 'task.html?mode=team';
    } else {
        showAlert('Please create or join a team first to assign tasks.', 'warning');
        // Scroll to create team section
        scrollToCreateTeam();
    }
}

function goToProgressTracking() {
    // Check if user has teams
    if (userTeams && userTeams.length > 0) {
        // Navigate to team dashboard for progress tracking
        const firstTeam = userTeams[0];
        window.location.href = `team-dashboard.html?teamId=${firstTeam.id}&mode=progress`;
    } else {
        showAlert('Please create or join a team first to track progress.', 'warning');
        // Scroll to create team section
        scrollToCreateTeam();
    }
}

function goToTeamDashboard(teamId) {
    // Navigate to team dashboard
    window.location.href = 'team-dashboard.html';
} 