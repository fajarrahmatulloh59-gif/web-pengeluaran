// State Management
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let archives = JSON.parse(localStorage.getItem('archives')) || [];
let yearlyArchives = JSON.parse(localStorage.getItem('yearlyArchives')) || [];
let userEmail = localStorage.getItem('userEmail') || null;

// DOM Elements
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const btnLogout = document.getElementById('btn-logout');
const currentUserEmailDisplay = document.getElementById('current-user-email');

const modal = document.getElementById('modal-form');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.querySelector('.close-modal');
const btnCancel = document.getElementById('btn-cancel');
const btnAddRow = document.getElementById('btn-add-row');
const btnCloseMonth = document.getElementById('btn-close-month');
const btnCloseYear = document.getElementById('btn-close-year');
const btnArchiveNow = document.getElementById('btn-archive-now');
const archiveBanner = document.getElementById('archive-banner');
const archiveList = document.getElementById('archive-list');
const yearlyArchiveList = document.getElementById('yearly-archive-list');
const multiRecordForm = document.getElementById('multi-record-form');
const recordInputsContainer = document.getElementById('record-inputs-container');
const expenseList = document.getElementById('expense-list');
const totalExpenseDisplay = document.getElementById('total-expense');
const totalDailyDisplay = document.getElementById('total-daily');
const totalMonthlyDisplay = document.getElementById('total-monthly');
const totalYearlyDisplay = document.getElementById('total-yearly');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// --- Auth Functions ---

function checkAuth() {
    if (userEmail) {
        loginPage.style.display = 'none';
        appContainer.style.display = 'block';
        currentUserEmailDisplay.textContent = `User: ${userEmail}`;
        
        // Only run app logic if authenticated
        checkEndOfMonth();
        renderApp();
        renderArchives();
        renderYearlyArchives();
    } else {
        loginPage.style.display = 'flex';
        appContainer.style.display = 'none';
    }
}

loginForm.onsubmit = (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    if (email) {
        userEmail = email;
        localStorage.setItem('userEmail', email);
        checkAuth();
    }
};

btnLogout.onclick = () => {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        localStorage.removeItem('userEmail');
        userEmail = null;
        window.location.reload(); 
    }
};

// --- Helper Functions ---

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function saveToLocalStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('archives', JSON.stringify(archives));
    localStorage.setItem('yearlyArchives', JSON.stringify(yearlyArchives));
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getMonthName(monthIndex) {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[monthIndex];
}

// --- Logic Functions ---

function renderApp() {
    renderTable();
    updateTotal();
}

function renderTable() {
    expenseList.innerHTML = '';
    
    // Sort by date descending
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedExpenses.length === 0) {
        expenseList.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada catatan pengeluaran.</td></tr>';
        return;
    }

    sortedExpenses.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>${item.category}</td>
            <td>${formatRupiah(item.amount)}</td>
            <td>${item.payment}</td>
            <td>
                <button class="btn-delete" onclick="deleteExpense(${expenses.indexOf(item)})">Hapus</button>
            </td>
        `;
        expenseList.appendChild(tr);
    });
}

function updateTotal() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
    const thisYearStr = todayStr.substring(0, 4); // YYYY

    let total = 0;
    let daily = 0;
    let monthly = 0;
    let yearly = 0;

    expenses.forEach(item => {
        const amount = parseFloat(item.amount);
        total += amount;

        if (item.date === todayStr) {
            daily += amount;
        }
        
        if (item.date.startsWith(thisMonthStr)) {
            monthly += amount;
        }

        if (item.date.startsWith(thisYearStr)) {
            yearly += amount;
        }
    });

    totalExpenseDisplay.textContent = formatRupiah(total);
    totalDailyDisplay.textContent = formatRupiah(daily);
    totalMonthlyDisplay.textContent = formatRupiah(monthly);
    totalYearlyDisplay.textContent = formatRupiah(yearly);
}

function deleteExpense(index) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
        expenses.splice(index, 1);
        saveToLocalStorage();
        renderApp();
    }
}

// --- Archive & PDF Logic ---

function checkEndOfMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Banner logic for previous calendar month
    const hasOldData = expenses.some(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear;
    });

    if (hasOldData) {
        archiveBanner.style.display = 'flex';
    }

    // 2. 30 Days automatic trigger
    if (expenses.length > 0) {
        const dates = expenses.map(item => new Date(item.date).getTime());
        const oldestDate = new Date(Math.min(...dates));
        const diffTime = Math.abs(now - oldestDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 30) {
            setTimeout(() => {
                if (confirm(`Pengeluaran anda sudah genap 1 bulan (sudah ${diffDays} hari). Arsipkan sekarang dan download PDF?`)) {
                    archiveCurrentMonth(true); // true means trigger download
                }
            }, 1000);
        }
    }

    // 3. 12 Months automatic trigger
    if (archives.length >= 12) {
        setTimeout(() => {
            if (confirm(`Pengeluaran anda sudah genap 12 bulan (1 tahun). Arsipkan sekarang dan download laporan PDF tahunan?`)) {
                archiveCurrentYear(true); // true means trigger download
            }
        }, 2000);
    }
}

function archiveCurrentMonth(autoDownload = false) {
    if (expenses.length === 0) {
        alert('Tidak ada data untuk diarsipkan.');
        return;
    }

    const latestDate = new Date(expenses[0].date);
    const label = `${getMonthName(latestDate.getMonth())} ${latestDate.getFullYear()}`;
    const total = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const newArchive = {
        id: Date.now(),
        monthYear: label,
        total: total,
        items: [...expenses]
    };

    archives.unshift(newArchive);
    expenses = [];

    saveToLocalStorage();
    renderApp();
    renderArchives();
    archiveBanner.style.display = 'none';
    
    if (autoDownload) {
        downloadPDF(newArchive.id);
    }
    
    alert(`Data bulan ${label} berhasil diarsipkan.`);
}

function archiveCurrentYear(autoDownload = false) {
    if (archives.length === 0) {
        alert('Tidak ada arsip bulanan untuk dikonsolidasi.');
        return;
    }

    const lastArchiveName = archives[0].monthYear;
    const yearLabel = lastArchiveName.split(' ')[1];
    const totalYearly = archives.reduce((sum, arc) => sum + arc.total, 0);
    const allItems = archives.flatMap(arc => arc.items);
    const monthlySummary = archives.map(arc => ({ month: arc.monthYear, total: arc.total }));

    const newYearlyArchive = {
        id: Date.now(),
        year: `Tahun ${yearLabel}`,
        total: totalYearly,
        monthlyBreakdown: monthlySummary,
        items: allItems
    };

    yearlyArchives.unshift(newYearlyArchive);
    archives = []; 

    saveToLocalStorage();
    renderArchives();
    renderYearlyArchives();

    if (autoDownload) {
        downloadYearlyPDF(newYearlyArchive.id);
    }

    alert(`Data tahun ${yearLabel} berhasil diarsipkan ke laporan tahunan.`);
}

function renderArchives() {
    archiveList.innerHTML = '';
    if (archives.length === 0) {
        archiveList.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada arsip bulanan.</td></tr>';
        return;
    }
    archives.forEach(archive => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${archive.monthYear}</td>
            <td>${formatRupiah(archive.total)}</td>
            <td>
                <button class="btn-pdf" onclick="downloadPDF(${archive.id})">Download PDF</button>
                <button class="btn-delete" style="margin-left:5px" onclick="deleteArchive(${archive.id})">Hapus</button>
            </td>
        `;
        archiveList.appendChild(tr);
    });
}

function renderYearlyArchives() {
    yearlyArchiveList.innerHTML = '';
    if (yearlyArchives.length === 0) {
        yearlyArchiveList.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada arsip tahunan.</td></tr>';
        return;
    }
    yearlyArchives.forEach(yearArc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${yearArc.year}</td>
            <td>${formatRupiah(yearArc.total)}</td>
            <td>
                <button class="btn-pdf" onclick="downloadYearlyPDF(${yearArc.id})">Download PDF Tahunan</button>
                <button class="btn-delete" style="margin-left:5px" onclick="deleteYearlyArchive(${yearArc.id})">Hapus</button>
            </td>
        `;
        yearlyArchiveList.appendChild(tr);
    });
}

function deleteArchive(id) {
    if (confirm('Hapus arsip ini selamanya?')) {
        archives = archives.filter(a => a.id !== id);
        saveToLocalStorage();
        renderArchives();
    }
}

function deleteYearlyArchive(id) {
    if (confirm('Hapus arsip TAHUNAN ini selamanya?')) {
        yearlyArchives = yearlyArchives.filter(ya => ya.id !== id);
        saveToLocalStorage();
        renderYearlyArchives();
    }
}

function downloadPDF(id) {
    const archive = archives.find(a => a.id === id) || yearlyArchives.find(ya => ya.items && ya.id === id); 
    const dataToUse = archive || archives[0]; 
    
    if (!dataToUse) return;

    const { jsPDF } = window.jspdf;
    const doc = jsPDF();

    doc.setFontSize(18);
    doc.text(`Rekapan Pengeluaran Rumah Tangga`, 14, 20);
    doc.setFontSize(14);
    doc.text(`Periode: ${dataToUse.monthYear || 'Arsip'}`, 14, 30);
    doc.text(`Total Pengeluaran: ${formatRupiah(dataToUse.total)}`, 14, 40);

    const tableData = dataToUse.items.map(item => [
        item.date,
        item.description,
        item.category,
        formatRupiah(item.amount),
        item.payment
    ]);

    doc.autoTable({
        startY: 50,
        head: [['Tanggal', 'Deskripsi', 'Jenis', 'Nominal', 'Metode']],
        body: tableData,
    });

    doc.save(`Pengeluaran_${(dataToUse.monthYear || 'Arsip').replace(' ', '_')}.pdf`);
}

function downloadYearlyPDF(id) {
    const yearArc = yearlyArchives.find(ya => ya.id === id);
    if (!yearArc) return;

    const { jsPDF } = window.jspdf;
    const doc = jsPDF();

    doc.setFontSize(18);
    doc.text(`Laporan Pengeluaran Rumah Tangga TAHUNAN`, 14, 20);
    doc.setFontSize(14);
    doc.text(`Periode: ${yearArc.year}`, 14, 30);
    doc.text(`Total Pengeluaran Setahun: ${formatRupiah(yearArc.total)}`, 14, 40);

    doc.text(`Ringkasan Per Bulan:`, 14, 55);
    const summaryData = yearArc.monthlyBreakdown.map(m => [m.month, formatRupiah(m.total)]);
    
    doc.autoTable({
        startY: 60,
        head: [['Bulan', 'Total Pengeluaran']],
        body: summaryData,
    });

    doc.addPage();
    doc.text(`Detail Transaksi Setahun:`, 14, 20);
    const detailData = yearArc.items.map(item => [
        item.date,
        item.description,
        item.category,
        formatRupiah(item.amount),
        item.payment
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Tanggal', 'Deskripsi', 'Jenis', 'Nominal', 'Metode']],
        body: detailData,
    });

    doc.save(`Laporan_Tahunan_${yearArc.year.replace(' ', '_')}.pdf`);
}

// Event Listeners for Archive
btnCloseMonth.onclick = () => {
    if (confirm('Arsipkan pengeluaran bulan ini dan download PDF?')) {
        archiveCurrentMonth(true);
    }
};

btnCloseYear.onclick = () => {
    if (confirm('Arsipkan pengeluaran TAHUNAN ini dan download PDF?')) {
        archiveCurrentYear(true);
    }
};

btnArchiveNow.onclick = () => archiveCurrentMonth(true);

// --- Modal & Form Logic ---

btnOpenModal.onclick = () => {
    modal.style.display = 'block';
    resetForm();
};

const closeModal = () => {
    modal.style.display = 'none';
};

btnCloseModal.onclick = closeModal;
btnCancel.onclick = closeModal;

window.onclick = (event) => {
    if (event.target == modal) closeModal();
};

function resetForm() {
    recordInputsContainer.innerHTML = '';
    addRow(); 
}

function addRow() {
    const row = document.createElement('div');
    row.className = 'record-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Tanggal</label>
            <input type="date" name="date" value="${getTodayDate()}" required>
        </div>
        <div class="form-group">
            <label>Deskripsi</label>
            <input type="text" name="description" placeholder="Beli apa?" required>
        </div>
        <div class="form-group">
            <label>Jenis</label>
            <select name="category" required>
                <option value="Makanan">Makanan</option>
                <option value="Transportasi">Transportasi</option>
                <option value="Belanja">Belanja</option>
                <option value="Tagihan">Tagihan</option>
                <option value="Lainnya">Lainnya</option>
            </select>
        </div>
        <div class="form-group">
            <label>Nominal</label>
            <input type="number" name="amount" placeholder="0" min="1" required>
        </div>
        <div class="form-group">
            <label>Metode</label>
            <select name="payment" required>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
                <option value="QRIS">QRIS</option>
                <option value="E-Wallet">E-Wallet</option>
            </select>
        </div>
        <button type="button" class="btn-remove-row" onclick="removeRow(this)">&times;</button>
    `;
    recordInputsContainer.appendChild(row);
    updateRemoveButtons();
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.record-row');
    if (rows.length > 1) {
        btn.parentElement.remove();
        updateRemoveButtons();
    }
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.record-row');
    const removeBtns = document.querySelectorAll('.btn-remove-row');
    removeBtns.forEach(btn => {
        btn.style.display = rows.length > 1 ? 'flex' : 'none';
    });
}

btnAddRow.onclick = addRow;

multiRecordForm.onsubmit = (e) => {
    e.preventDefault();
    const rows = document.querySelectorAll('.record-row');
    const newRecords = [];
    rows.forEach(row => {
        const record = {
            date: row.querySelector('[name="date"]').value,
            description: row.querySelector('[name="description"]').value,
            category: row.querySelector('[name="category"]').value,
            amount: parseFloat(row.querySelector('[name="amount"]').value),
            payment: row.querySelector('[name="payment"]').value
        };
        newRecords.push(record);
    });
    expenses = [...expenses, ...newRecords];
    saveToLocalStorage();
    renderApp();
    closeModal();
};
