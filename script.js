
const form = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

let transactions = [];

try {
  transactions = JSON.parse(
    localStorage.getItem("transactions")
  ) || [];
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
}

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

renderTransactions();
updateSummary();
