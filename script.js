import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBR5HZ7Y3vpXHIKVsvkClZeKDastUMJQWI",
    authDomain: "web-pengeluaran.firebaseapp.com",
    projectId: "web-pengeluaran",
    storageBucket: "web-pengeluaran.firebasestorage.app",
    messagingSenderId: "615532747927",
    appId: "1:615532747927:web:0e44573c3078599b4b9dd2",
    measurementId: "G-HEKBPSVC1W"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// State Management
let expenses = [];
let incomes = [];
let archives = [];
let yearlyArchives = [];
let currentUser = null;
let inactivityTimer;

// --- Auto Logout Logic (15 Detik) ---
function resetInactivityTimer() {
    if (!currentUser) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        if (currentUser) {
            console.log("Inactivity detected. Logging out...");
            await signOut(auth);
            window.location.reload();
        }
    }, 15000); // 15 detik
}

// Pantau aktivitas user
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});

// --- Formatting Rupiah Input Logic ---
function formatNumberWithDots(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function unformatNumber(string) {
    return parseFloat(string.replace(/\./g, '')) || 0;
}

function handleAmountInput(e) {
    if (e.target && (e.target.name === 'amount' || e.target.id === 'income-amount')) {
        let value = e.target.value.replace(/\D/g, ""); // Ambil hanya angka
        if (value) {
            e.target.value = formatNumberWithDots(value);
        }
    }
}

// Pantau semua input di halaman secara global
document.addEventListener('input', handleAmountInput);

// Daftarkan ke window (untuk cadangan)
window.handleAmountInput = handleAmountInput;
window.unformatNumber = unformatNumber;

// DOM Elements
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLogout = document.getElementById('btn-logout');
const currentUserEmailDisplay = document.getElementById('current-user-email');
const userPhotoDisplay = document.getElementById('user-photo');

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

const totalBalanceDisplay = document.getElementById('total-balance');
const monthlyIncomeDisplay = document.getElementById('monthly-income');
const monthlyBalanceDisplay = document.getElementById('monthly-balance');
const totalDailyDisplay = document.getElementById('total-daily');
const totalMonthlyDisplay = document.getElementById('total-monthly');
const totalYearlyDisplay = document.getElementById('total-yearly');

// --- Auth Functions ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (loginPage) loginPage.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (currentUserEmailDisplay) currentUserEmailDisplay.textContent = user.displayName || user.email;
        if (userPhotoDisplay) {
            userPhotoDisplay.src = user.photoURL || '';
            userPhotoDisplay.style.display = 'block';
        }
        
        setupRealtimeListeners(user.uid);
    } else {
        currentUser = null;
        if (loginPage) loginPage.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
});

if (btnLoginGoogle) {
    btnLoginGoogle.onclick = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
            alert("Gagal login: " + error.message);
        }
    };
}

if (btnLogout) {
    btnLogout.onclick = async () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            await signOut(auth);
            window.location.reload();
        }
    };
}

// --- Firestore Realtime Listeners ---

function setupRealtimeListeners(uid) {
    // Listen to Expenses
    const qExpenses = query(collection(db, "users", uid, "expenses"), orderBy("date", "desc"));
    onSnapshot(qExpenses, (snapshot) => {
        expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses();
        updateTotal();
        checkEndOfMonth();
    });

    // Listen to Incomes
    const qIncomes = query(collection(db, "users", uid, "incomes"), orderBy("date", "desc"));
    onSnapshot(qIncomes, (snapshot) => {
        incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderIncomes();
        updateTotal();
    });

    // Listen to Archives
    const qArchives = query(collection(db, "users", uid, "archives"), orderBy("timestamp", "desc"));
    onSnapshot(qArchives, (snapshot) => {
        archives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderArchives();
    });

    // Listen to Yearly Archives
    const qYearlyArchives = query(collection(db, "users", uid, "yearlyArchives"), orderBy("timestamp", "desc"));
    onSnapshot(qYearlyArchives, (snapshot) => {
        yearlyArchives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderYearlyArchives();
    });
}

// --- Helper Functions ---

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getMonthName(monthIndex) {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[monthIndex];
}

// --- UI Rendering Functions ---

function renderExpenses() {
    if (!expenseList) return;
    expenseList.innerHTML = '';

    if (expenses.length === 0) {
        expenseList.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada catatan pengeluaran.</td></tr>';
        return;
    }

    expenses.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>${item.category}</td>
            <td>${formatRupiah(item.amount)}</td>
            <td>${item.payment}</td>
            <td>
                <button class="btn-delete" onclick="window.deleteExpense('${item.id}')">Hapus</button>
            </td>
        `;
        expenseList.appendChild(tr);
    });
}

function renderIncomes() {
    if (!incomeList) return;
    incomeList.innerHTML = '';

    if (incomes.length === 0) {
        incomeList.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada catatan pemasukkan.</td></tr>';
        return;
    }

    incomes.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>${formatRupiah(item.amount)}</td>
            <td>
                <button class="btn-delete" onclick="window.deleteIncome('${item.id}')">Hapus</button>
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

    if (monthlyIncomeDisplay) monthlyIncomeDisplay.textContent = formatRupiah(monthlyInc);
    if (monthlyBalanceDisplay) monthlyBalanceDisplay.textContent = formatRupiah(monthlyInc - monthlyExp);
    if (totalBalanceDisplay) totalBalanceDisplay.textContent = formatRupiah(totalInc - totalExp);
    if (totalDailyDisplay) totalDailyDisplay.textContent = formatRupiah(dailyExp);
    if (totalMonthlyDisplay) totalMonthlyDisplay.textContent = formatRupiah(monthlyExp);
    if (totalYearlyDisplay) totalYearlyDisplay.textContent = formatRupiah(yearlyExp);
}

window.handleAmountInput = handleAmountInput;

// --- CRUD Actions ---

window.deleteExpense = async (id) => {
    if (confirm('Hapus catatan pengeluaran ini?')) {
        await deleteDoc(doc(db, "users", currentUser.uid, "expenses", id));
    }
};

window.deleteIncome = async (id) => {
    if (confirm('Hapus catatan pemasukkan ini?')) {
        await deleteDoc(doc(db, "users", currentUser.uid, "incomes", id));
    }
};

// --- Archive & PDF Logic ---

function checkEndOfMonth() {
    // Jika tidak ada data pengeluaran sama sekali, banner HARUS disembunyikan
    if (expenses.length === 0) {
        if (archiveBanner) archiveBanner.style.display = 'none';
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Periksa apakah ada data yang bulannya atau tahunnya sudah lewat
    const hasOldData = expenses.some(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear;
    });

    if (hasOldData && archiveBanner) {
        archiveBanner.style.display = 'flex';
    } else if (archiveBanner) {
        archiveBanner.style.display = 'none';
    }
}

async function archiveCurrentMonth(autoDownload = false) {
    if (expenses.length === 0 && incomes.length === 0) {
        alert('Tidak ada data untuk diarsipkan.');
        return;
    }

    const latestDate = expenses.length > 0 ? new Date(expenses[0].date) : new Date();
    const label = `${getMonthName(latestDate.getMonth())} ${latestDate.getFullYear()}`;
    const totalExp = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalInc = incomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const newArchive = {
        monthYear: label,
        totalExpense: totalExp,
        totalIncome: totalInc,
        balance: totalInc - totalExp,
        expenses: [...expenses],
        incomes: [...incomes],
        timestamp: serverTimestamp()
    };

    try {
        const archiveRef = await addDoc(collection(db, "users", currentUser.uid, "archives"), newArchive);
        
        // Delete archived data from active collections
        for (const exp of expenses) {
            await deleteDoc(doc(db, "users", currentUser.uid, "expenses", exp.id));
        }
        for (const inc of incomes) {
            await deleteDoc(doc(db, "users", currentUser.uid, "incomes", inc.id));
        }

        if (archiveBanner) archiveBanner.style.display = 'none';
        
        if (autoDownload) {
            downloadPDF({ id: archiveRef.id, ...newArchive });
        }
        
        alert(`Data bulan ${label} berhasil diarsipkan.`);
    } catch (error) {
        console.error("Archive Error:", error);
        alert("Gagal mengarsipkan data.");
    }
}

async function archiveCurrentYear(autoDownload = false) {
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
        year: `Tahun ${yearLabel}`,
        totalExpense: totalExp,
        totalIncome: totalInc,
        balance: totalInc - totalExp,
        monthlyBreakdown: monthlySummary,
        expenses: allExp,
        incomes: allInc,
        timestamp: serverTimestamp()
    };

    try {
        const yArchiveRef = await addDoc(collection(db, "users", currentUser.uid, "yearlyArchives"), newYearlyArchive);
        
        // Clear monthly archives
        for (const arc of archives) {
            await deleteDoc(doc(db, "users", currentUser.uid, "archives", arc.id));
        }

        if (autoDownload) {
            downloadYearlyPDF({ id: yArchiveRef.id, ...newYearlyArchive });
        }

        alert(`Data tahun ${yearLabel} berhasil diarsipkan ke laporan tahunan.`);
    } catch (error) {
        console.error("Yearly Archive Error:", error);
        alert("Gagal mengarsipkan tahunan.");
    }
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
                <button class="btn-pdf" onclick="window.downloadPDF('${archive.id}')">Download PDF</button>
                <button class="btn-delete" style="margin-left:5px" onclick="window.deleteArchive('${archive.id}')">Hapus</button>
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
                <button class="btn-pdf" onclick="window.downloadYearlyPDF('${yearArc.id}')">Download PDF Tahunan</button>
                <button class="btn-delete" style="margin-left:5px" onclick="window.deleteYearlyArchive('${yearArc.id}')">Hapus</button>
            </td>
        `;
        yearlyArchiveList.appendChild(tr);
    });
}

window.deleteArchive = async (id) => {
    if (confirm('Hapus arsip ini selamanya?')) {
        await deleteDoc(doc(db, "users", currentUser.uid, "archives", id));
    }
};

window.deleteYearlyArchive = async (id) => {
    if (confirm('Hapus arsip TAHUNAN ini selamanya?')) {
        await deleteDoc(doc(db, "users", currentUser.uid, "yearlyArchives", id));
    }
};

window.downloadPDF = (id) => {
    const archive = archives.find(a => a.id === id);
    if (!archive) return;

    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();

    docPdf.setFontSize(18);
    docPdf.text(`Rekapan Keuangan Rumah Tangga`, 14, 20);
    docPdf.setFontSize(12);
    docPdf.text(`Periode: ${archive.monthYear}`, 14, 30);
    docPdf.text(`Total Pemasukkan: ${formatRupiah(archive.totalIncome)}`, 14, 38);
    docPdf.text(`Total Pengeluaran: ${formatRupiah(archive.totalExpense)}`, 14, 46);
    docPdf.text(`Sisa Saldo: ${formatRupiah(archive.balance)}`, 14, 54);

    docPdf.text(`Daftar Pengeluaran:`, 14, 65);
    const expData = archive.expenses.map(item => [item.date, item.description, item.category, formatRupiah(item.amount), item.payment]);
    docPdf.autoTable({
        startY: 70,
        head: [['Tanggal', 'Deskripsi', 'Jenis', 'Nominal', 'Metode']],
        body: expData,
    });

    const finalY = docPdf.lastAutoTable.finalY || 70;
    docPdf.text(`Daftar Pemasukkan:`, 14, finalY + 15);
    const incData = archive.incomes.map(item => [item.date, item.description, formatRupiah(item.amount)]);
    docPdf.autoTable({
        startY: finalY + 20,
        head: [['Tanggal', 'Deskripsi', 'Nominal']],
        body: incData,
    });

    docPdf.save(`Keuangan_${archive.monthYear.replace(' ', '_')}.pdf`);
}

window.downloadYearlyPDF = (id) => {
    const yearArc = yearlyArchives.find(ya => ya.id === id);
    if (!yearArc) return;

    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();

    docPdf.setFontSize(18);
    docPdf.text(`Laporan Keuangan Rumah Tangga TAHUNAN`, 14, 20);
    docPdf.setFontSize(12);
    docPdf.text(`Periode: ${yearArc.year}`, 14, 30);
    docPdf.text(`Total Pemasukkan Setahun: ${formatRupiah(yearArc.totalIncome)}`, 14, 38);
    docPdf.text(`Total Pengeluaran Setahun: ${formatRupiah(yearArc.totalExpense)}`, 14, 46);
    docPdf.text(`Sisa Saldo: ${formatRupiah(yearArc.balance)}`, 14, 54);

    docPdf.text(`Ringkasan Per Bulan:`, 14, 65);
    const summaryData = yearArc.monthlyBreakdown.map(m => [m.month, formatRupiah(m.inc), formatRupiah(m.exp)]);
    docPdf.autoTable({
        startY: 70,
        head: [['Bulan', 'Pemasukkan', 'Pengeluaran']],
        body: summaryData,
    });

    docPdf.addPage();
    docPdf.text(`Detail Seluruh Transaksi Setahun:`, 14, 20);
    const combined = [
        ...yearArc.expenses.map(i => ({...i, type: 'Pengeluaran'})),
        ...yearArc.incomes.map(i => ({...i, type: 'Pemasukkan'}))
    ].sort((a,b) => new Date(a.date) - new Date(b.date));

    docPdf.autoTable({
        startY: 30,
        head: [['Tanggal', 'Deskripsi', 'Tipe', 'Nominal']],
        body: combined.map(i => [i.date, i.description, i.type, formatRupiah(i.amount)]),
    });

    docPdf.save(`Laporan_Tahunan_${yearArc.year.replace(' ', '_')}.pdf`);
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
        <div class="form-group"><label>Nominal</label><input type="text" name="amount" placeholder="0" oninput="window.handleAmountInput(event)" required></div>
        <div class="form-group"><label>Metode</label><select name="payment" required><option value="Cash">Cash</option><option value="Transfer">Transfer</option><option value="QRIS">QRIS</option><option value="E-Wallet">E-Wallet</option></select></div>
        <button type="button" class="btn-remove-row" onclick="window.removeRow(this)">&times;</button>
    `;
    recordInputsContainer.appendChild(row);
    updateRemoveButtons();
}

window.removeRow = (btn) => {
    const rows = document.querySelectorAll('.record-row');
    if (rows.length > 1) { btn.parentElement.remove(); updateRemoveButtons(); }
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.record-row');
    document.querySelectorAll('.btn-remove-row').forEach(btn => btn.style.display = rows.length > 1 ? 'flex' : 'none');
}

if (btnAddRow) btnAddRow.onclick = addRow;

if (multiRecordForm) {
    multiRecordForm.onsubmit = async (e) => {
        e.preventDefault();
        const rows = document.querySelectorAll('.record-row');
        const batchPromise = [];
        
        rows.forEach(row => {
            const amountRaw = row.querySelector('[name="amount"]').value;
            const newRecord = {
                date: row.querySelector('[name="date"]').value,
                description: row.querySelector('[name="description"]').value,
                category: row.querySelector('[name="category"]').value,
                amount: unformatNumber(amountRaw), // Ubah kembali ke angka murni
                payment: row.querySelector('[name="payment"]').value,
                timestamp: serverTimestamp()
            };
            batchPromise.push(addDoc(collection(db, "users", currentUser.uid, "expenses"), newRecord));
        });

        try {
            await Promise.all(batchPromise);
            if (modal) modal.style.display = 'none';
            // Reset form setelah berhasil
            multiRecordForm.reset();
            resetForm(); 
        } catch (error) {
            console.error("Save Expenses Error:", error);
            alert("Gagal menyimpan data.");
        }
    };
}

if (incomeForm) {
    incomeForm.onsubmit = async (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('income-date').value;
        const descVal = document.getElementById('income-description').value;
        const amountRaw = document.getElementById('income-amount').value;
        
        const newIncome = {
            date: dateVal,
            description: descVal,
            amount: unformatNumber(amountRaw),
            timestamp: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "users", currentUser.uid, "incomes"), newIncome);
            if (modalIncome) modalIncome.style.display = 'none';
            incomeForm.reset();
        } catch (error) {
            console.error("Save Income Error:", error);
            alert("Gagal menyimpan data.");
        }
    };
}
