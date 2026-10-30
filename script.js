
const form = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

let transactions = [];

try {
  const savedData = JSON.parse(
    localStorage.getItem("transactions")
  );

  if (Array.isArray(savedData)) {
    transactions = savedData;
  }
} catch (error) {
  transactions = [];
}

const moneyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

// Save transactions
function saveTransactions() {
  localStorage.setItem(
    "transactions",
    JSON.stringify(transactions)
  );
}

// Update dashboard summary
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

// Render transaction history
function renderTransactions() {
  transactionList.replaceChildren();

  if (transactions.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No transactions yet.";
    transactionList.appendChild(message);
  }

  transactions.forEach(item => {
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

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      transactions = transactions.filter(
        transaction => transaction.id !== item.id
      );

      saveTransactions();
      renderTransactions();
      updateSummary();
    });

    card.append(details, amount, deleteButton);
    transactionList.appendChild(card);
  });

  updateCharts();
}

// Chart variables
let incomeExpenseChart = null;
let categoryChart = null;

// Update analytics charts
function updateCharts() {
  const incomeCanvas =
    document.getElementById("incomeExpenseChart");

  const categoryCanvas =
    document.getElementById("categoryChart");

  if (!incomeCanvas || !categoryCanvas) return;

  if (typeof Chart === "undefined") {
    console.error("Chart.js is not loaded.");
    return;
  }

  const totalIncome = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  // Destroy old charts before updating
  if (incomeExpenseChart) {
    incomeExpenseChart.destroy();
  }

  if (categoryChart) {
    categoryChart.destroy();
  }

  // Income vs Expenses Bar Chart
  incomeExpenseChart = new Chart(incomeCanvas, {
    type: "bar",

    data: {
      labels: ["Income", "Expenses"],

      datasets: [{
        label: "Amount (₹)",
        data: [totalIncome, totalExpenses],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderRadius: 8
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Calculate category-wise expenses
  const expenseCategories = {};

  transactions
    .filter(item => item.type === "expense")
    .forEach(item => {
      expenseCategories[item.category] =
        (expenseCategories[item.category] || 0) + item.amount;
    });

  // Category-wise Doughnut Chart
  categoryChart = new Chart(categoryCanvas, {
    type: "doughnut",

    data: {
      labels: Object.keys(expenseCategories),

      datasets: [{
        data: Object.values(expenseCategories),

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

// Add new transaction
form.addEventListener("submit", function(event) {
  event.preventDefault();

  const description = document
    .getElementById("description")
    .value.trim();

  const amount = Number(
    document.getElementById("amount").value
  );

  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid description and amount.");
    return;
  }

  const transaction = {
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    description,
    amount,
    type,
    category,
    date: new Date().toLocaleDateString("en-IN")
  };

  transactions.unshift(transaction);

  saveTransactions();
  renderTransactions();
  updateSummary();

  form.reset();
});

// Initial dashboard loading
renderTransactions();
updateSummary();

