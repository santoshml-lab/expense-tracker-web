
const API_URL = "https://expense-tracker-backend-bxef.onrender.com";

const form = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

const searchInput = document.getElementById("searchTransaction");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const clearFiltersButton = document.getElementById("clearFilters");
const exportCSVButton = document.getElementById("exportCSV");
const exportPDFButton = document.getElementById("exportPDF");

let transactions = [];
let editingTransactionId = null;

const moneyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function toISODate(dateString) {
  const [day, month, year] = dateString.split("/");
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function loadTransactions() {
  try {
    transactionList.textContent = "Loading transactions...";

    const response = await fetch(`${API_URL}/transactions`);

    if (!response.ok) {
      throw new Error("Could not load transactions.");
    }

    const data = await response.json();

    transactions = data.map(item => ({
      ...item,
      type: item.transaction_type,
      date: formatDate(item.date)
    }));

    renderTransactions();

  } catch (error) {
    console.error(error);
    transactionList.textContent =
      "Unable to load transactions. Please refresh the page.";
  }
}

function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((total, item) => total + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((total, item) => total + item.amount, 0);

  document.getElementById("income").textContent =
    moneyFormat.format(income);

  document.getElementById("expenses").textContent =
    moneyFormat.format(expenses);

  document.getElementById("balance").textContent =
    moneyFormat.format(income - expenses);
}

// Apply all selected filters to transactions.
function getFilteredTransactions() {
  const searchText = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const selectedType = filterType
    ? filterType.value
    : "all";

  const selectedCategory = filterCategory
    ? filterCategory.value
    : "all";

  const fromDate = startDate ? startDate.value : "";
  const toDate = endDate ? endDate.value : "";

  return transactions.filter(item => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchText) ||
      item.category.toLowerCase().includes(searchText);

    const matchesType =
      selectedType === "all" ||
      item.type === selectedType;

    const matchesCategory =
      selectedCategory === "all" ||
      item.category === selectedCategory;

    const transactionDate = toISODate(item.date);

    const matchesStartDate =
      !fromDate || transactionDate >= fromDate;

    const matchesEndDate =
      !toDate || transactionDate <= toDate;

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesStartDate &&
      matchesEndDate
    );
  });
}

// Export filtered transactions as CSV.
function exportTransactionsToCSV() {
  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    alert("No transactions available to export.");
    return;
  }

  const headers = [
    "ID",
    "Description",
    "Amount",
    "Type",
    "Category",
    "Date"
  ];

  const rows = filteredTransactions.map(item => [
    item.id,
    item.description,
    item.amount,
    item.type,
    item.category,
    toISODate(item.date)
  ]);

  const escapeCSV = value => {
    let text = String(value ?? "");

    if (/^[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers,
    ...rows
  ]
    .map(row => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "expense-report.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Export filtered transactions as PDF.
function exportTransactionsToPDF() {
  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    alert("No transactions available to export.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library could not load. Please refresh the page.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const income = filteredTransactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = filteredTransactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = income - expenses;

  // Report heading
  pdf.setFontSize(20);
  pdf.setTextColor(30, 64, 120);
  pdf.text("EXPENSE TRACKER REPORT", 14, 20);

  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);

  pdf.text(
    `Generated: ${new Date().toLocaleDateString("en-IN")}`,
    14,
    29
  );

  // Summary section
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);

  pdf.text("FINANCIAL SUMMARY", 14, 43);

  pdf.setFontSize(10);

  pdf.text(`Total Income: Rs. ${income.toFixed(2)}`, 14, 53);
  pdf.text(`Total Expenses: Rs. ${expenses.toFixed(2)}`, 14, 61);
  pdf.text(`Remaining Balance: Rs. ${balance.toFixed(2)}`, 14, 69);

  pdf.text(
    `Total Transactions: ${filteredTransactions.length}`,
    14,
    77
  );

  // Table heading
  let y = 91;

  const columns = [
    { title: "ID", x: 14 },
    { title: "Description", x: 27 },
    { title: "Amount", x: 88 },
    { title: "Type", x: 116 },
    { title: "Category", x: 139 },
    { title: "Date", x: 174 }
  ];

  function drawTableHeader() {
    pdf.setFillColor(30, 64, 120);
    pdf.rect(12, y - 6, 186, 10, "F");

    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);

    columns.forEach(column => {
      pdf.text(column.title, column.x, y);
    });

    y += 9;
    pdf.setTextColor(0, 0, 0);
  }

  drawTableHeader();

  // Transaction rows
  filteredTransactions.forEach((item, index) => {

    if (y > 275) {
      pdf.addPage();
      y = 20;
      drawTableHeader();
    }

    const description = pdf.splitTextToSize(
      String(item.description),
      55
    );

    const category = pdf.splitTextToSize(
      String(item.category),
      28
    );

    const rowHeight = Math.max(
      9,
      description.length * 4,
      category.length * 4
    );

    if (index % 2 === 0) {
      pdf.setFillColor(240, 244, 250);
      pdf.rect(12, y - 5, 186, rowHeight, "F");
    }

    pdf.setFontSize(8);

    pdf.text(String(item.id), 14, y);
    pdf.text(description, 27, y);

    pdf.text(
      Number(item.amount).toFixed(2),
      88,
      y
    );

    pdf.text(item.type, 116, y);
    pdf.text(category, 139, y);
    pdf.text(item.date, 174, y);

    y += rowHeight + 3;
  });

  // Footer on every page
  const pageCount = pdf.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);

    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);

    pdf.text(
      `Expense Tracker | Page ${page} of ${pageCount}`,
      14,
      290
    );
  }

  pdf.save("expense-report.pdf");
}

function renderTransactions() {
  transactionList.replaceChildren();

  const filteredTransactions = getFilteredTransactions();

  if (transactions.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No transactions yet.";
    transactionList.appendChild(message);

  } else if (filteredTransactions.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching transactions found.";
    transactionList.appendChild(message);
  }

  filteredTransactions.forEach(item => {
    const card = document.createElement("div");
    card.className = "transaction-item";

    const details = document.createElement("div");

    const description = document.createElement("strong");
    description.textContent = item.description;

    const category = document.createElement("p");
    category.textContent = `${item.category} • ${item.date}`;

    details.append(description, category);

    const amount = document.createElement("span");
    amount.textContent =
      `${item.type === "income" ? "+" : "-"}${moneyFormat.format(item.amount)}`;

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.type = "button";

    editButton.addEventListener("click", () => {
      editTransaction(item);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";

    deleteButton.addEventListener("click", async () => {
      await deleteTransaction(item.id);
    });

    card.append(details, amount, editButton, deleteButton);
    transactionList.appendChild(card);
  });

  updateSummary();
  updateCharts();
  updateMonthlyReport();
}

// Fill the form with existing transaction details.
function editTransaction(item) {
  editingTransactionId = item.id;

  document.getElementById("description").value = item.description;
  document.getElementById("amount").value = item.amount;
  document.getElementById("type").value = item.type;
  document.getElementById("category").value = item.category;

  const submitButton = form.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.textContent = "Update Transaction";
  }

  form.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// Save edited transaction using PUT API.
async function updateTransaction(transaction) {
  const response = await fetch(
    `${API_URL}/transactions/${editingTransactionId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transaction)
    }
  );

  if (!response.ok) {
    throw new Error("Could not update transaction.");
  }

  await response.json();

  editingTransactionId = null;
  form.reset();

  const submitButton = form.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.textContent = "Add Transaction";
  }

  await loadTransactions();
}

async function deleteTransaction(id) {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not delete transaction.");
    }

    await loadTransactions();

  } catch (error) {
    console.error(error);
    alert("Unable to delete transaction. Please try again.");
  }
}

let incomeExpenseChart = null;
let categoryChart = null;
let monthlyChart = null;

function updateCharts() {
  const incomeCanvas =
    document.getElementById("incomeExpenseChart");

  const categoryCanvas =
    document.getElementById("categoryChart");

  if (!incomeCanvas || !categoryCanvas) return;
  if (typeof Chart === "undefined") return;

  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  if (incomeExpenseChart) incomeExpenseChart.destroy();
  if (categoryChart) categoryChart.destroy();

  incomeExpenseChart = new Chart(incomeCanvas, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [{
        label: "Amount (₹)",
        data: [income, expenses],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  const categories = {};

  transactions
    .filter(item => item.type === "expense")
    .forEach(item => {
      categories[item.category] =
        (categories[item.category] || 0) + item.amount;
    });

  categoryChart = new Chart(categoryCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          "#3b82f6",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#14b8a6"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Monthly expense report
function updateMonthlyReport() {
  const now = new Date();

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthExpenses = transactions.filter(item => {
    if (item.type !== "expense") return false;

    const [day, month, year] = item.date.split("/").map(Number);

    return (
      month === currentMonth + 1 &&
      year === currentYear
    );
  });

  const monthlyTotal = currentMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  document.getElementById("monthlyExpense").textContent =
    moneyFormat.format(monthlyTotal);

  document.getElementById("monthlyTransactions").textContent =
    currentMonthExpenses.length;

  const monthlyCanvas =
    document.getElementById("monthlyChart");

  if (!monthlyCanvas || typeof Chart === "undefined") return;

  const labels = [];
  const monthlyData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);

    const month = date.getMonth();
    const year = date.getFullYear();

    labels.push(
      date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit"
      })
    );

    const total = transactions
      .filter(item => {
        if (item.type !== "expense") return false;

        const [day, transactionMonth, transactionYear] =
          item.date.split("/").map(Number);

        return (
          transactionMonth === month + 1 &&
          transactionYear === year
        );
      })
      .reduce((sum, item) => sum + item.amount, 0);

    monthlyData.push(total);
  }

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(monthlyCanvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Monthly Expenses (₹)",
        data: monthlyData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Search and filter event listeners.
if (searchInput) {
  searchInput.addEventListener("input", renderTransactions);
}

if (filterType) {
  filterType.addEventListener("change", renderTransactions);
}

if (filterCategory) {
  filterCategory.addEventListener("change", renderTransactions);
}

if (startDate) {
  startDate.addEventListener("change", renderTransactions);
}

if (endDate) {
  endDate.addEventListener("change", renderTransactions);
}

// Reset all filters.
if (clearFiltersButton) {
  clearFiltersButton.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (filterType) filterType.value = "all";
    if (filterCategory) filterCategory.value = "all";
    if (startDate) startDate.value = "";
    if (endDate) endDate.value = "";

    renderTransactions();
  });
}

// CSV export button event.
if (exportCSVButton) {
  exportCSVButton.addEventListener("click", exportTransactionsToCSV);
}

// PDF export button event.
if (exportPDFButton) {
  exportPDFButton.addEventListener("click", exportTransactionsToPDF);
}

// Add or update a transaction.
form.addEventListener("submit", async function(event) {
  event.preventDefault();

  const description = document
    .getElementById("description").value.trim();

  const amount = Number(
    document.getElementById("amount").value
  );

  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid description and amount.");
    return;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Keep original date when editing.
  const existingTransaction = transactions.find(
    item => item.id === editingTransactionId
  );

  const transaction = {
    description,
    amount,
    transaction_type: type,
    category,
    date: existingTransaction
      ? toISODate(existingTransaction.date)
      : `${year}-${month}-${day}`
  };

  const submitButton = form.querySelector('button[type="submit"]');

  try {
    if (submitButton) submitButton.disabled = true;

    if (editingTransactionId !== null) {
      await updateTransaction(transaction);
    } else {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(transaction)
      });

      if (!response.ok) {
        throw new Error("Could not save transaction.");
      }

      await response.json();

      form.reset();
      await loadTransactions();
    }

  } catch (error) {
    console.error(error);
    alert("Unable to save transaction. Please try again.");

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// Initial loading
loadTransactions();








