// js/dashboard-pdf.js - Export to PDF for premium users using jsPDF and autoTable
// Requires: jsPDF and autoTable loaded in dashboard.html

document.addEventListener('DOMContentLoaded', function() {
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    let userRole = 'free';
    let currentUser = null;
    function updateExportPdfButton() {
        if (exportPdfBtn) {
            if (userRole === 'premium') {
                exportPdfBtn.classList.remove('d-none');
            } else {
                exportPdfBtn.classList.add('d-none');
            }
        }
    }
    function onUserRoleChange() {
        updateExportPdfButton();
    }
    if (window.firebaseInitialized && window.firebaseAuth && window.firebaseDb) {
        window.firebaseInitialized.then(() => {
            const auth = window.firebaseAuth;
            const db = window.firebaseDb;
            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (!user) return;
                let userDoc;
                try {
                    userDoc = await db.collection('users').doc(user.uid).get();
                    userRole = userDoc.data()?.role || 'free';
                } catch (err) {}
                onUserRoleChange();
            });
        });
    }
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => exportToPDF());
    }
});

async function exportToPDF() {
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
    // Sort: Pending (by last updated desc) on top, then Done (by last updated desc) at bottom
    tasks.sort((a, b) => {
        const aStatus = (a.status || '').toLowerCase();
        const bStatus = (b.status || '').toLowerCase();
        const aUpdated = a.updatedAt && typeof a.updatedAt.toDate === 'function' ? a.updatedAt.toDate() : new Date(a.updatedAt || a.createdAt || 0);
        const bUpdated = b.updatedAt && typeof b.updatedAt.toDate === 'function' ? b.updatedAt.toDate() : new Date(b.updatedAt || b.createdAt || 0);
        if (aStatus === 'completed' && bStatus !== 'completed') return 1;
        if (aStatus !== 'completed' && bStatus === 'completed') return -1;
        // Both same status, sort by last updated desc
        return bUpdated - aUpdated;
    });
    // Prepare data for table (wider columns, more fields)
    const tableData = tasks.map(task => [
        task.title || task.text || '',
        (task.inputMethod || '').toLowerCase() === 'voice' ? 'Voice' : 'Manual',
        (task.status || '').toLowerCase() === 'completed' ? 'Done' : 'Pending',
        formatPdfDate(task.createdAt),
        formatPdfDate(task.dueDate),
        formatPdfDate(task.updatedAt),
        task.priority || '',
        task.description || ''
    ]);
    // Create PDF (landscape, A4)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    // Header
    doc.setFontSize(18);
    doc.setTextColor(54, 102, 241);
    doc.text('QuickNotes AI - Task Report', doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`User: ${user.email}`, 40, 54);
    doc.text(`Exported: ${formatPdfDate(new Date())}`, 40, 72);
    // Table
    doc.autoTable({
        startY: 90,
        head: [[
            'Task', 'Type', 'Status', 'Created', 'Due', 'Last Updated', 'Priority', 'Description'
        ]],
        body: tableData,
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 12 },
        bodyStyles: { fontSize: 11, cellPadding: 4 },
        alternateRowStyles: { fillColor: [243, 244, 246] },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        margin: { left: 40, right: 40 },
        tableWidth: 'auto',
        columnStyles: {
            0: { cellWidth: 90 }, // Task
            1: { cellWidth: 50 }, // Type
            2: { cellWidth: 55 }, // Status
            3: { cellWidth: 80 }, // Created
            4: { cellWidth: 80 }, // Due
            5: { cellWidth: 80 }, // Last Updated
            6: { cellWidth: 55 }, // Priority
            7: { cellWidth: 180 } // Description
        }
    });
    doc.save('tasks_report.pdf');
}

function formatPdfDate(date) {
    if (!date) return '';
    if (typeof date.toDate === 'function') date = date.toDate();
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
