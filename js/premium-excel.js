// SheetJS (xlsx.js) Excel export for Premium users on premium.html
// Requires: <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script> in premium.html

document.addEventListener('DOMContentLoaded', function() {
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    let userRole = 'free';
    let currentUser = null;
    function updateExportExcelButton() {
        if (exportExcelBtn) {
            if (userRole === 'premium') {
                exportExcelBtn.classList.remove('d-none');
            } else {
                exportExcelBtn.classList.add('d-none');
            }
        }
    }
    function onUserRoleChange() {
        updateExportExcelButton();
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
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => exportToExcel());
    }
});

async function exportToExcel() {
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
    // Prepare worksheet data
    const ws_data = [];
    // Title row
    ws_data.push(["QuickNotes AI – Task Export", '', '', '']);
    // Header row
    ws_data.push([
        'Task Description',
        'Task Type',
        'Status',
        'Created At'
    ]);
    // Data rows
    tasks.forEach(task => {
        ws_data.push([
            task.title || task.text || '',
            (task.inputMethod || '').toLowerCase() === 'voice' ? 'Voice' : 'Manual',
            (task.status || '').toLowerCase() === 'completed' ? 'Done' : 'Pending',
            formatExcelDate(task.createdAt)
        ]);
    });
    // Footer row
    ws_data.push([
        `Exported by: ${user.email}`,
        '',
        '',
        `Export date: ${new Date().toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    ]);
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    // Merge title row
    ws['!merges'] = [
        { s: { r:0, c:0 }, e: { r:0, c:3 } }
    ];
    // Set column widths
    ws['!cols'] = [
        { wch: 40 }, // Task Description
        { wch: 16 }, // Task Type
        { wch: 14 }, // Status
        { wch: 26 }  // Created At
    ];
    // Style header row
    for (let c = 0; c < 4; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
        if (cell) {
            cell.s = {
                font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 },
                fill: { fgColor: { rgb: 'B0B8C9' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
            };
        }
    }
    // Style title row
    const titleCell = ws['A1'];
    if (titleCell) {
        titleCell.s = {
            font: { bold: true, color: { rgb: '0D3CD8' }, sz: 16 },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
    }
    // Style footer row
    for (let c = 0; c < 4; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: ws_data.length - 1, c })];
        if (cell) {
            cell.s = {
                font: { italic: true, color: { rgb: '6366F1' }, sz: 11 },
                alignment: { horizontal: c === 0 ? 'left' : 'right', vertical: 'center' }
            };
        }
    }
    // Alternating row background colors for data rows
    for (let r = 2; r < ws_data.length - 1; r++) {
        for (let c = 0; c < 4; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell) {
                cell.s = cell.s || {};
                cell.s.fill = cell.s.fill || {};
                cell.s.fill.fgColor = { rgb: (r % 2 === 0) ? 'F3F4F6' : 'FFFFFF' };
                cell.s.alignment = cell.s.alignment || {};
                cell.s.alignment.wrapText = true;
            }
        }
    }
    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'quicknotesai_tasks_export.xlsx');
}

function formatExcelDate(date) {
    if (!date) return '';
    if (typeof date.toDate === 'function') date = date.toDate();
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
