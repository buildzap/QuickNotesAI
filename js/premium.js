// premium.js - Handles premium-only features for premium.html

// Show Export to CSV button only for premium users
document.addEventListener('DOMContentLoaded', function() {
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    let userRole = 'free';
    let currentUser = null;
    function updateExportCsvButton() {
        if (exportCsvBtn) {
            if (userRole === 'premium') {
                exportCsvBtn.classList.remove('d-none');
            } else {
                exportCsvBtn.classList.add('d-none');
            }
        }
    }
    function onUserRoleChange() {
        updateExportCsvButton();
    }
    if (window.firebaseInitialized && window.firebaseAuth && window.firebaseDb) {
        window.firebaseInitialized.then(() => {
            const auth = window.firebaseAuth;
            const db = window.firebaseDb;
            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (!user) return;
                
                // Update user name display
                const userNameElement = document.getElementById('userName');
                if (userNameElement) {
                    // Extract name from email (everything before @)
                    const name = user.email.split('@')[0];
                    // Capitalize first letter
                    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                    userNameElement.textContent = `👋 Welcome, ${displayName}`;
                }
                
                let userDoc;
                try {
                    userDoc = await db.collection('users').doc(user.uid).get();
                    userRole = userDoc.data()?.role || 'free';
                } catch (err) {}
                onUserRoleChange();
            });
        });
    }
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportData('csv'));
    }
});

// Export Data (Premium)
async function exportData(format) {
    if (!window.firebaseAuth || !window.firebaseDb) return;
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const user = auth.currentUser;
    if (!user) {
        alert('You must be signed in.');
        return;
    }
    let tasks = [];
    try {
        const snapshot = await db.collection('tasks').where('userId', '==', user.uid).get();
        tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        alert('Failed to fetch tasks for export.');
        return;
    }
    if (format === 'csv') {
        exportToCSV(tasks);
    }
}

function exportToCSV(tasks) {
    const headers = [
        'Title',
        'Created',
        'Due',
        'Last Updated',
        'Description',
        'Priority',
        'Status'
    ];
    // Add a title row and a blank row for visual separation
    const titleRow = ['QuickNotes AI - Task Export'];
    const blankRow = [''];
    // Format date to a more readable format
    function formatDate(date) {
        if (!date) return '';
        if (typeof date.toDate === 'function') date = date.toDate();
        if (!(date instanceof Date)) date = new Date(date);
        return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    const rows = tasks.map(task => [
        escapeCSV(task.title || ''),
        formatDate(task.createdAt),
        formatDate(task.dueDate),
        formatDate(task.updatedAt),
        escapeCSV(task.description || ''),
        escapeCSV(task.priority || ''),
        escapeCSV(task.status || '')
    ]);
    // Add a summary row at the end
    const summaryRow = [`Total Tasks: ${tasks.length}`];
    const csvContent = [
        titleRow.join(','),
        blankRow.join(','),
        headers.join(','),
        ...rows.map(row => row.join(',')),
        blankRow.join(','),
        summaryRow.join(',')
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks_export.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function escapeCSV(value) {
    if (typeof value !== 'string') value = String(value || '');
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}
