// State Management
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// DOM Elements
const modal = document.getElementById('modal-form');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.querySelector('.close-modal');
const btnCancel = document.getElementById('btn-cancel');
const btnAddRow = document.getElementById('btn-add-row');
const multiRecordForm = document.getElementById('multi-record-form');
const recordInputsContainer = document.getElementById('record-inputs-container');
const expenseList = document.getElementById('expense-list');
const totalExpenseDisplay = document.getElementById('total-expense');
const totalDailyDisplay = document.getElementById('total-daily');
const totalMonthlyDisplay = document.getElementById('total-monthly');
const totalYearlyDisplay = document.getElementById('total-yearly');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});

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
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
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
    addRow(); // Start with one empty row
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
