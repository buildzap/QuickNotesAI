// setup-test-users.js - Script to create test users for team collaboration testing
// Run this in browser console on your QuickNotes AI app to set up test users

console.log('🚀 Setting up test users for team collaboration testing...');

// Test user data
const testUsers = [
    {
        email: 'premium1@test.com',
        password: 'testpass123',
        name: 'Premium User 1',
        role: 'premium'
    },
    {
        email: 'premium2@test.com', 
        password: 'testpass123',
        name: 'Premium User 2',
        role: 'premium'
    },
    {
        email: 'free@test.com',
        password: 'testpass123', 
        name: 'Free User',
        role: 'free'
    }
];

// Function to create test user
async function createTestUser(userData) {
    try {
        console.log(`Creating user: ${userData.email}`);
        
        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            userData.email, 
            userData.password
        );
        
        // Create user document in Firestore
        await firebase.firestore()
            .collection('users')
            .doc(userCredential.user.uid)
            .set({
                name: userData.name,
                email: userData.email,
                role: userData.role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        return userCredential.user;
        
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log(`⚠️ User already exists: ${userData.email}`);
        } else {
            console.error(`❌ Error creating user ${userData.email}:`, error);
        }
    }
}

// Function to set user role (if user already exists)
async function setUserRole(email, role) {
    try {
        // Find user by email
        const usersRef = firebase.firestore().collection('users');
        const q = usersRef.where('email', '==', email);
        const querySnapshot = await q.get();
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            await userDoc.ref.update({ role: role });
            console.log(`✅ Updated role for ${email} to ${role}`);
        } else {
            console.log(`⚠️ User not found: ${email}`);
        }
    } catch (error) {
        console.error(`❌ Error updating role for ${email}:`, error);
    }
}

// Main setup function
async function setupTestUsers() {
    console.log('📋 Starting test user setup...');
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase not available. Make sure you are on the QuickNotes AI app.');
        return;
    }
    
    // Create each test user
    for (const userData of testUsers) {
        await createTestUser(userData);
    }
    
    console.log('🎉 Test user setup complete!');
    console.log('');
    console.log('📝 Test Users Created:');
    console.log('1. Premium User 1: premium1@test.com (premium)');
    console.log('2. Premium User 2: premium2@test.com (premium)');
    console.log('3. Free User: free@test.com (free)');
    console.log('');
    console.log('🔑 Password for all users: testpass123');
    console.log('');
    console.log('🧪 Ready for team collaboration testing!');
}

// Function to verify test users
async function verifyTestUsers() {
    console.log('🔍 Verifying test users...');
    
    try {
        const usersRef = firebase.firestore().collection('users');
        const querySnapshot = await usersRef.get();
        
        console.log('📊 Current users in database:');
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            console.log(`- ${userData.email}: ${userData.role || 'free'}`);
        });
        
    } catch (error) {
        console.error('❌ Error verifying users:', error);
    }
}

// Function to clean up test users (use with caution!)
async function cleanupTestUsers() {
    if (!confirm('⚠️ This will delete all test users. Are you sure?')) {
        return;
    }
    
    console.log('🧹 Cleaning up test users...');
    
    try {
        const usersRef = firebase.firestore().collection('users');
        const querySnapshot = await usersRef.get();
        
        for (const doc of querySnapshot.docs) {
            const userData = doc.data();
            if (userData.email.includes('@test.com')) {
                await doc.ref.delete();
                console.log(`🗑️ Deleted: ${userData.email}`);
            }
        }
        
        console.log('✅ Cleanup complete!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

// Export functions to global scope
window.setupTestUsers = setupTestUsers;
window.verifyTestUsers = verifyTestUsers;
window.cleanupTestUsers = cleanupTestUsers;

console.log('📚 Available functions:');
console.log('- setupTestUsers() - Create test users');
console.log('- verifyTestUsers() - Check existing users');
console.log('- cleanupTestUsers() - Remove test users');

// Auto-run setup if requested
if (window.location.search.includes('setup=test')) {
    setupTestUsers();
} 