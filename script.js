// State Management
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let incomes = JSON.parse(localStorage.getItem('incomes')) || [];
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
const modalIncome = document.getElementById('modal-income');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnOpenModalIncome = document.getElementById('btn-open-modal-income');
const btnCloseModal = document.querySelector('.close-modal');
const btnCloseModalIncome = document.querySelector('.close-modal-income');
const btnCancel = document.getElementById('btn-cancel');
const btnCancelIncome = document.getElementById('btn-cancel-income');

const btnAddRow = document.getElementById('btn-add-row');
const btnCloseMonth = document.getElementById('btn-close-month');
const btnCloseYear = document.getElementById('btn-close-year');
const btnArchiveNow = document.getElementById('btn-archive-now');
const archiveBanner = document.getElementById('archive-banner');
const archiveList = document.getElementById('archive-list');
const yearlyArchiveList = document.getElementById('yearly-archive-list');

const multiRecordForm = document.getElementById('multi-record-form');
const incomeForm = document.getElementById('income-form');
const recordInputsContainer = document.getElementById('record-inputs-container');

const expenseList = document.getElementById('expense-list');
const incomeList = document.getElementById('income-list');

const totalExpenseDisplay = document.getElementById('total-expense');
const totalIncomeDisplay = document.getElementById('total-income');
const totalBalanceDisplay = document.getElementById('total-balance');
const monthlyIncomeDisplay = document.getElementById('monthly-income');
const monthlyBalanceDisplay = document.getElementById('monthly-balance');
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
        if (loginPage) loginPage.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (currentUserEmailDisplay) currentUserEmailDisplay.textContent = `User: ${userEmail}`;
        
        checkEndOfMonth();
        renderApp();
        renderArchives();
        renderYearlyArchives();
    } else {
        if (loginPage) loginPage.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
}

if (loginForm) {
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const email = loginEmailInput.value.trim();
        if (email) {
            userEmail = email;
            localStorage.setItem('userEmail', email);
            checkAuth();
        }
    };
}

if (btnLogout) {
    btnLogout.onclick = () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            localStorage.removeItem('userEmail');
            userEmail = null;
            window.location.reload(); 
        }
    };
}

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
    localStorage.setItem('incomes', JSON.stringify(incomes));
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
    renderExpenses();
    renderIncomes();
    updateTotal();
}

function renderExpenses() {
    if (!expenseList) return;
    expenseList.innerHTML = '';
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedExpenses.length === 0) {
        expenseList.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada catatan pengeluaran.</td></tr>';
        return;
    }

    sortedExpenses.forEach((item) => {
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

function renderIncomes() {
    if (!incomeList) return;
    incomeList.innerHTML = '';
    const sortedIncomes = [...incomes].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedIncomes.length === 0) {
        incomeList.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada catatan pemasukkan.</td></tr>';
        return;
    }

    sortedIncomes.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>${formatRupiah(item.amount)}</td>
            <td>
                <button class="btn-delete" onclick="deleteIncome(${incomes.indexOf(item)})">Hapus</button>
            </td>
        `;
        incomeList.appendChild(tr);
    });
}

function updateTotal() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7); 
    const thisYearStr = todayStr.substring(0, 4); 

    let totalExp = 0;
    let totalInc = 0;
    let monthlyExp = 0;
    let monthlyInc = 0;
    let dailyExp = 0;
    let yearlyExp = 0;

    expenses.forEach(item => {
        const amount = parseFloat(item.amount);
        totalExp += amount;
        if (item.date === todayStr) dailyExp += amount;
        if (item.date.startsWith(thisMonthStr)) monthlyExp += amount;
        if (item.date.startsWith(thisYearStr)) yearlyExp += amount;
    });

    incomes.forEach(item => {
        const amount = parseFloat(item.amount);
        totalInc += amount;
        if (item.date.startsWith(thisMonthStr)) monthlyInc += amount;
    });

    if (totalExpenseDisplay) totalExpenseDisplay.textContent = formatRupiah(totalExp);
    if (totalIncomeDisplay) totalIncomeDisplay.textContent = formatRupiah(totalInc);
    if (monthlyIncomeDisplay) monthlyIncomeDisplay.textContent = formatRupiah(monthlyInc);
    if (monthlyBalanceDisplay) monthlyBalanceDisplay.textContent = formatRupiah(monthlyInc - monthlyExp);
    
    if (totalBalanceDisplay) totalBalanceDisplay.textContent = formatRupiah(totalInc - totalExp);
    if (totalDailyDisplay) totalDailyDisplay.textContent = formatRupiah(dailyExp);
    if (totalMonthlyDisplay) totalMonthlyDisplay.textContent = formatRupiah(monthlyExp);
    if (totalYearlyDisplay) totalYearlyDisplay.textContent = formatRupiah(yearlyExp);
}

function deleteExpense(index) {
    if (confirm('Hapus catatan pengeluaran ini?')) {
        expenses.splice(index, 1);
        saveToLocalStorage();
        renderApp();
    }
}

function deleteIncome(index) {
    if (confirm('Hapus catatan pemasukkan ini?')) {
        incomes.splice(index, 1);
        saveToLocalStorage();
        renderApp();
    }
}

// --- Archive & PDF Logic ---

function checkEndOfMonth() {
    if (expenses.length === 0 && incomes.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const hasOldData = expenses.some(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear;
    });

    if (hasOldData && archiveBanner) {
        archiveBanner.style.display = 'flex';
    }

    if (expenses.length > 0) {
        const dates = expenses.map(item => new Date(item.date).getTime());
        const oldestDate = new Date(Math.min(...dates));
        const diffTime = Math.abs(now - oldestDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 30) {
            setTimeout(() => {
                if (confirm(`Pengeluaran anda sudah genap 1 bulan (sudah ${diffDays} hari). Arsipkan sekarang dan download PDF?`)) {
                    archiveCurrentMonth(true); 
                }
            }, 1000);
        }
    }

    if (archives.length >= 12) {
        setTimeout(() => {
            if (confirm(`Pengeluaran anda sudah genap 12 bulan (1 tahun). Arsipkan sekarang dan download laporan PDF tahunan?`)) {
                archiveCurrentYear(true); 
            }
        }, 2000);
    }
}

function archiveCurrentMonth(autoDownload = false) {
    if (expenses.length === 0 && incomes.length === 0) {
        alert('Tidak ada data untuk diarsipkan.');
        return;
    }

    const latestDate = expenses.length > 0 ? new Date(expenses[0].date) : new Date();
    const label = `${getMonthName(latestDate.getMonth())} ${latestDate.getFullYear()}`;
    const totalExp = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalInc = incomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const newArchive = {
        id: Date.now(),
        monthYear: label,
        totalExpense: totalExp,
        totalIncome: totalInc,
        balance: totalInc - totalExp,
        expenses: [...expenses],
        incomes: [...incomes]
    };

    archives.unshift(newArchive);
    expenses = [];
    incomes = [];

    saveToLocalStorage();
    renderApp();
    renderArchives();
    if (archiveBanner) archiveBanner.style.display = 'none';
    
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
    const totalExp = archives.reduce((sum, arc) => sum + arc.totalExpense, 0);
    const totalInc = archives.reduce((sum, arc) => sum + arc.totalIncome, 0);
    const allExp = archives.flatMap(arc => arc.expenses);
    const allInc = archives.flatMap(arc => arc.incomes);
    
    const monthlySummary = archives.map(arc => ({ 
        month: arc.monthYear, 
        exp: arc.totalExpense,
        inc: arc.totalIncome
    }));

    const newYearlyArchive = {
        id: Date.now(),
        year: `Tahun ${yearLabel}`,
        totalExpense: totalExp,
        totalIncome: totalInc,
        balance: totalInc - totalExp,
        monthlyBreakdown: monthlySummary,
        expenses: allExp,
        incomes: allInc
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
    if (!archiveList) return;
    archiveList.innerHTML = '';
    if (archives.length === 0) {
        archiveList.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada arsip bulanan.</td></tr>';
        return;
    }
    archives.forEach(archive => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${archive.monthYear}</td>
            <td>${formatRupiah(archive.totalExpense)}</td>
            <td>
                <button class="btn-pdf" onclick="downloadPDF(${archive.id})">Download PDF</button>
                <button class="btn-delete" style="margin-left:5px" onclick="deleteArchive(${archive.id})">Hapus</button>
            </td>
        `;
        archiveList.appendChild(tr);
    });
}

function renderYearlyArchives() {
    if (!yearlyArchiveList) return;
    yearlyArchiveList.innerHTML = '';
    if (yearlyArchives.length === 0) {
        yearlyArchiveList.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada arsip tahunan.</td></tr>';
        return;
    }
    yearlyArchives.forEach(yearArc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${yearArc.year}</td>
            <td>${formatRupiah(yearArc.totalExpense)}</td>
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
    const archive = archives.find(a => a.id === id);
    if (!archive) return;

    const { jsPDF } = window.jspdf;
    const doc = jsPDF();

    doc.setFontSize(18);
    doc.text(`Rekapan Keuangan Rumah Tangga`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Periode: ${archive.monthYear}`, 14, 30);
    doc.text(`Total Pemasukkan: ${formatRupiah(archive.totalIncome)}`, 14, 38);
    doc.text(`Total Pengeluaran: ${formatRupiah(archive.totalExpense)}`, 14, 46);
    doc.text(`Sisa Saldo: ${formatRupiah(archive.balance)}`, 14, 54);

    doc.text(`Daftar Pengeluaran:`, 14, 65);
    const expData = archive.expenses.map(item => [item.date, item.description, item.category, formatRupiah(item.amount), item.payment]);
    doc.autoTable({
        startY: 70,
        head: [['Tanggal', 'Deskripsi', 'Jenis', 'Nominal', 'Metode']],
        body: expData,
    });

    const finalY = doc.lastAutoTable.finalY || 70;
    doc.text(`Daftar Pemasukkan:`, 14, finalY + 15);
    const incData = archive.incomes.map(item => [item.date, item.description, formatRupiah(item.amount)]);
    doc.autoTable({
        startY: finalY + 20,
        head: [['Tanggal', 'Deskripsi', 'Nominal']],
        body: incData,
    });

    doc.save(`Keuangan_${archive.monthYear.replace(' ', '_')}.pdf`);
}

function downloadYearlyPDF(id) {
    const yearArc = yearlyArchives.find(ya => ya.id === id);
    if (!yearArc) return;

    const { jsPDF } = window.jspdf;
    const doc = jsPDF();

    doc.setFontSize(18);
    doc.text(`Laporan Keuangan Rumah Tangga TAHUNAN`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Periode: ${yearArc.year}`, 14, 30);
    doc.text(`Total Pemasukkan Setahun: ${formatRupiah(yearArc.totalIncome)}`, 14, 38);
    doc.text(`Total Pengeluaran Setahun: ${formatRupiah(yearArc.totalExpense)}`, 14, 46);
    doc.text(`Sisa Saldo: ${formatRupiah(yearArc.balance)}`, 14, 54);

    doc.text(`Ringkasan Per Bulan:`, 14, 65);
    const summaryData = yearArc.monthlyBreakdown.map(m => [m.month, formatRupiah(m.inc), formatRupiah(m.exp)]);
    doc.autoTable({
        startY: 70,
        head: [['Bulan', 'Pemasukkan', 'Pengeluaran']],
        body: summaryData,
    });

    doc.addPage();
    doc.text(`Detail Seluruh Transaksi Setahun:`, 14, 20);
    const combined = [
        ...yearArc.expenses.map(i => ({...i, type: 'Pengeluaran'})),
        ...yearArc.incomes.map(i => ({...i, type: 'Pemasukkan'}))
    ].sort((a,b) => new Date(a.date) - new Date(b.date));

    doc.autoTable({
        startY: 30,
        head: [['Tanggal', 'Deskripsi', 'Tipe', 'Nominal']],
        body: combined.map(i => [i.date, i.description, i.type, formatRupiah(i.amount)]),
    });

    doc.save(`Laporan_Tahunan_${yearArc.year.replace(' ', '_')}.pdf`);
}

// Event Listeners
if (btnCloseMonth) {
    btnCloseMonth.onclick = () => {
        if (confirm('Arsipkan keuangan bulan ini dan download PDF?')) archiveCurrentMonth(true);
    };
}
if (btnCloseYear) {
    btnCloseYear.onclick = () => {
        if (confirm('Arsipkan keuangan TAHUNAN ini dan download PDF?')) archiveCurrentYear(true);
    };
}
if (btnArchiveNow) btnArchiveNow.onclick = () => archiveCurrentMonth(true);

// --- Modal & Form Logic ---

if (btnOpenModal) {
    btnOpenModal.onclick = () => { 
        if (modal) modal.style.display = 'block'; 
        resetForm(); 
    };
}

if (btnOpenModalIncome) {
    btnOpenModalIncome.onclick = () => { 
        if (modalIncome) modalIncome.style.display = 'block'; 
        const dateInput = document.getElementById('income-date');
        if (dateInput) dateInput.value = getTodayDate(); 
    };
}

if (btnCloseModal) btnCloseModal.onclick = () => { if (modal) modal.style.display = 'none'; };
if (btnCloseModalIncome) btnCloseModalIncome.onclick = () => { if (modalIncome) modalIncome.style.display = 'none'; };
if (btnCancel) btnCancel.onclick = () => { if (modal) modal.style.display = 'none'; };
if (btnCancelIncome) btnCancelIncome.onclick = () => { if (modalIncome) modalIncome.style.display = 'none'; };

window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
    if (event.target == modalIncome) modalIncome.style.display = 'none';
};

function resetForm() { 
    if (recordInputsContainer) {
        recordInputsContainer.innerHTML = ''; 
        addRow(); 
    }
}

function addRow() {
    if (!recordInputsContainer) return;
    const row = document.createElement('div');
    row.className = 'record-row';
    row.innerHTML = `
        <div class="form-group"><label>Tanggal</label><input type="date" name="date" value="${getTodayDate()}" required></div>
        <div class="form-group"><label>Deskripsi</label><input type="text" name="description" placeholder="Beli apa?" required></div>
        <div class="form-group"><label>Jenis</label><select name="category" required><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Belanja">Belanja</option><option value="Tagihan">Tagihan</option><option value="Lainnya">Lainnya</option></select></div>
        <div class="form-group"><label>Nominal</label><input type="number" name="amount" placeholder="0" min="1" required></div>
        <div class="form-group"><label>Metode</label><select name="payment" required><option value="Cash">Cash</option><option value="Transfer">Transfer</option><option value="QRIS">QRIS</option><option value="E-Wallet">E-Wallet</option></select></div>
        <button type="button" class="btn-remove-row" onclick="removeRow(this)">&times;</button>
    `;
    recordInputsContainer.appendChild(row);
    updateRemoveButtons();
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.record-row');
    if (rows.length > 1) { btn.parentElement.remove(); updateRemoveButtons(); }
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.record-row');
    document.querySelectorAll('.btn-remove-row').forEach(btn => btn.style.display = rows.length > 1 ? 'flex' : 'none');
}

if (btnAddRow) btnAddRow.onclick = addRow;

if (multiRecordForm) {
    multiRecordForm.onsubmit = (e) => {
        e.preventDefault();
        const rows = document.querySelectorAll('.record-row');
        const newRecords = [];
        rows.forEach(row => {
            newRecords.push({
                date: row.querySelector('[name="date"]').value,
                description: row.querySelector('[name="description"]').value,
                category: row.querySelector('[name="category"]').value,
                amount: parseFloat(row.querySelector('[name="amount"]').value),
                payment: row.querySelector('[name="payment"]').value
            });
        });
        expenses = [...expenses, ...newRecords];
        saveToLocalStorage();
        renderApp();
        if (modal) modal.style.display = 'none';
    };
}

if (incomeForm) {
    incomeForm.onsubmit = (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('income-date').value;
        const descVal = document.getElementById('income-description').value;
        const amountVal = document.getElementById('income-amount').value;
        
        incomes.push({
            date: dateVal,
            description: descVal,
            amount: parseFloat(amountVal)
        });
        saveToLocalStorage();
        renderApp();
        if (modalIncome) modalIncome.style.display = 'none';
        incomeForm.reset();
    };
}
