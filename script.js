
const form = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

let transactions = [];

try {
  const savedData = JSON.parse(
    localStorage.getItem("transactions")
  );

  if (Array.isArray(savedData)) {
    transactions = savedData.filter(item =>
      item &&
      typeof item.description === "string" &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      ["income", "expense"].includes(item.type)
    );
  }
} catch (error) {
  transactions = [];
}

const moneyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

function saveTransactions() {
  localStorage.setItem(
    "transactions",
    JSON.stringify(transactions)
  );
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
  updateMonthlyReport();
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

    const parts = item.date.split("/").map(Number);

    if (parts.length !== 3) return false;

    const [day, month, year] = parts;

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

  // Last 6 months
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

        const parts = item.date.split("/").map(Number);
        if (parts.length !== 3) return false;

        const [day, transactionMonth, transactionYear] = parts;

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

// Add transaction
form.addEventListener("submit", function(event) {
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

// Initial loading
renderTransactions();
updateSummary();




