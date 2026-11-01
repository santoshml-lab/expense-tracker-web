
const API_URL = "https://expense-tracker-backend-bxef.onrender.com";

const form = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

let transactions = [];

// Keep old localStorage data untouched.
const moneyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

// Convert backend date (YYYY-MM-DD) to DD/MM/YYYY.
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

// Load transactions from backend.
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

    deleteButton.addEventListener("click", async () => {
      await deleteTransaction(item.id);
    });

    card.append(details, amount, deleteButton);
    transactionList.appendChild(card);
  });

  updateSummary();
  updateCharts();
  updateMonthlyReport();
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

// Add a new transaction to the backend.
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

  const transaction = {
    description,
    amount,
    transaction_type: type,
    category,
    date: `${year}-${month}-${day}`
  };

  const submitButton = form.querySelector('button[type="submit"]');

  try {
    if (submitButton) submitButton.disabled = true;

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

  } catch (error) {
    console.error(error);
    alert("Unable to save transaction. Please try again.");

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// Initial loading
loadTransactions();





