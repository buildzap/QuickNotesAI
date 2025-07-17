// dashboard-excel.js - Professional Excel export for dashboard (Premium users)
// Requires: <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script> in dashboard.html

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
        exportCsvBtn.addEventListener('click', () => exportToExcel());
        // Add CSV export for professional, readable CSV
        exportCsvBtn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            exportToProfessionalCSV();
        });
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
    // Sort: Pending (by last updated desc) on top, then Done (by last updated desc) at bottom
    tasks.sort((a, b) => {
        const aStatus = (a.status || '').toLowerCase();
        const bStatus = (b.status || '').toLowerCase();
        const aUpdated = a.updatedAt && typeof a.updatedAt.toDate === 'function' ? a.updatedAt.toDate() : new Date(a.updatedAt || a.createdAt || 0);
        const bUpdated = b.updatedAt && typeof b.updatedAt.toDate === 'function' ? b.updatedAt.toDate() : new Date(b.updatedAt || b.createdAt || 0);
        if (aStatus === 'completed' && bStatus !== 'completed') return 1;
        if (aStatus !== 'completed' && bStatus === 'completed') return -1;
        return bUpdated - aUpdated;
    });
    // Prepare worksheet data
    const ws_data = [];
    // Title row
    ws_data.push(["QuickNotes AI – Task Export", '', '', '', '', '', '', '']);
    // Header row
    ws_data.push([
        'Task', 'Type', 'Status', 'Created', 'Due', 'Last Updated', 'Priority', 'Description'
    ]);
    // Data rows
    tasks.forEach(task => {
        ws_data.push([
            task.title || task.text || '',
            (task.inputMethod || '').toLowerCase() === 'voice' ? 'Voice' : 'Manual',
            (task.status || '').toLowerCase() === 'completed' ? 'Done' : 'Pending',
            formatExcelDate(task.createdAt),
            formatExcelDate(task.dueDate),
            formatExcelDate(task.updatedAt),
            task.priority || '',
            task.description || ''
        ]);
    });
    // Footer row
    ws_data.push([
        `Exported by: ${user.email}`,
        '', '', '', '', '', '',
        `Export date: ${new Date().toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    ]);
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    // Merge title row
    ws['!merges'] = [
        { s: { r:0, c:0 }, e: { r:0, c:7 } }
    ];
    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Task
        { wch: 12 }, // Type
        { wch: 12 }, // Status
        { wch: 18 }, // Created
        { wch: 18 }, // Due
        { wch: 18 }, // Last Updated
        { wch: 12 }, // Priority
        { wch: 40 }  // Description
    ];
    // Style header row
    for (let c = 0; c < 8; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
        if (cell) {
            cell.s = {
                font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14, name: 'Inter' },
                fill: { fgColor: { rgb: '6366F1' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: {
                    top: { style: 'thin', color: { rgb: '6366F1' } },
                    bottom: { style: 'thin', color: { rgb: '6366F1' } },
                    left: { style: 'thin', color: { rgb: '6366F1' } },
                    right: { style: 'thin', color: { rgb: '6366F1' } }
                }
            };
        }
    }
    // Style title row
    const titleCell = ws['A1'];
    if (titleCell) {
        titleCell.s = {
            font: { bold: true, color: { rgb: '6366F1' }, sz: 20, name: 'Inter' },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'F3F4F6' } },
            border: {
                top: { style: 'thin', color: { rgb: '6366F1' } },
                bottom: { style: 'thin', color: { rgb: '6366F1' } },
                left: { style: 'thin', color: { rgb: '6366F1' } },
                right: { style: 'thin', color: { rgb: '6366F1' } }
            }
        };
    }
    // Style footer row
    for (let c = 0; c < 8; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: ws_data.length - 1, c })];
        if (cell) {
            cell.s = {
                font: { italic: true, color: { rgb: '6366F1' }, sz: 12, name: 'Inter' },
                alignment: { horizontal: c === 0 ? 'left' : 'right', vertical: 'center' },
                fill: { fgColor: { rgb: 'F3F4F6' } },
                border: {
                    top: { style: 'thin', color: { rgb: '6366F1' } },
                    bottom: { style: 'thin', color: { rgb: '6366F1' } },
                    left: { style: 'thin', color: { rgb: '6366F1' } },
                    right: { style: 'thin', color: { rgb: '6366F1' } }
                }
            };
        }
    }
    // Alternating row background colors for data rows
    for (let r = 2; r < ws_data.length - 1; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell) {
                cell.s = cell.s || {};
                cell.s.fill = cell.s.fill || {};
                cell.s.fill.fgColor = { rgb: (r % 2 === 0) ? 'F3F4F6' : 'FFFFFF' };
                cell.s.alignment = cell.s.alignment || {};
                cell.s.alignment.wrapText = true;
                cell.s.font = cell.s.font || {};
                cell.s.font.name = 'Inter';
                cell.s.font.sz = 12;
                cell.s.border = {
                    top: { style: 'thin', color: { rgb: '6366F1' } },
                    bottom: { style: 'thin', color: { rgb: '6366F1' } },
                    left: { style: 'thin', color: { rgb: '6366F1' } },
                    right: { style: 'thin', color: { rgb: '6366F1' } }
                };
            }
        }
    }
    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'quicknotesai_tasks_export.xlsx');
}

// Professional CSV export (title, header, blank, data, footer)
async function exportToProfessionalCSV() {
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
        return bUpdated - aUpdated;
    });
    // Build CSV rows
    const rows = [];
    // Title row
    rows.push(["QuickNotes AI – Task Export"]);
    // Blank row
    rows.push([]);
    // Header row
    rows.push([
        'Task', 'Type', 'Status', 'Created', 'Due', 'Last Updated', 'Priority', 'Description'
    ]);
    // Data rows
    tasks.forEach(task => {
        rows.push([
            task.title || task.text || '',
            (task.inputMethod || '').toLowerCase() === 'voice' ? 'Voice' : 'Manual',
            (task.status || '').toLowerCase() === 'completed' ? 'Done' : 'Pending',
            formatExcelDate(task.createdAt),
            formatExcelDate(task.dueDate),
            formatExcelDate(task.updatedAt),
            task.priority || '',
            task.description || ''
        ]);
    });
    // Blank row
    rows.push([]);
    // Footer row
    rows.push([
        `Exported by: ${user.email}`,
        '', '', '', '', '', '',
        `Export date: ${new Date().toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    ]);
    // Convert to CSV string
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'quicknotesai_tasks_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatExcelDate(date) {
    if (!date) return '';
    if (typeof date.toDate === 'function') date = date.toDate();
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
