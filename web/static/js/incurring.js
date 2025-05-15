async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            alert('Ошибка при выходе');
        }
    } catch (error) {
        alert('Ошибка при выходе: ' + error);
    }
}

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("openModalProducts").addEventListener("click", function () {
        openModal("modal-products");
    });

    document.getElementById("openModalServices").addEventListener("click", function () {
        openModal("modal-services");
    });

    document.getElementById("openModalClothes").addEventListener("click", function () {
        openModal("modal-clothes");
    });

    document.querySelectorAll(".close-modal").forEach(button => {
        button.addEventListener("click", function () {
            const modalId = this.getAttribute("data-modal");
            closeModal(modalId);
        });
    });
});

function addNewRow(tableId) {
    const newItemName = prompt("Введите наименование товара:");

    if (newItemName === null || newItemName.trim() === "") {
        return;
    }

    const table = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);

    cell1.innerHTML = newItemName.trim();
    cell2.innerHTML = "0 руб";
    cell3.innerHTML = '<input type="number" min="0" step="0.01" class="expense-input" placeholder="Введите сумму">';
}

document.addEventListener("DOMContentLoaded", function() {
    function updateContainerHeight() {
        const container = document.querySelector('.back');
        const categoriesContainer = document.getElementById('categoriesContainer');
        const categoriesCount = categoriesContainer.children.length;

        const BASE_HEIGHT = 500;
        const ROW_HEIGHT = 100;
        const BOTTOM_SPACING = 20;

        const rows = Math.ceil(categoriesCount / 3);
        const newHeight = BASE_HEIGHT +
                        (Math.max(0, rows - 2) * ROW_HEIGHT) +
                        BOTTOM_SPACING;

        container.style.minHeight = `${newHeight}px`;
    }

    document.getElementById('addCategoryBtn').addEventListener('click', async function () {
        const categoryName = prompt('Введите название новой категории:');
        if (!categoryName || categoryName.trim() === '') return;

        const monthId = document.getElementById("month-select").value;

        try {
            const formData = new FormData();
            formData.append("name", categoryName.trim());
            formData.append("month_id", monthId);

            const response = await fetch("/api/categories", {
                method: "POST",
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === "exists") {
                alert("Категория с таким названием уже существует в этом месяце.");
                return;
            }

            fetchCategories();

        } catch (err) {
            console.error(err);
            alert("Не удалось добавить категорию");
        }
    });
});

async function loadProducts(modalId, categoryId) {
    try {
        const response = await fetch(`/api/products?category_id=${categoryId}`);
        const products = await response.json();

        const tableBody = document.querySelector(`#${modalId}-table tbody`);
        tableBody.innerHTML = "";

        const expenseResponse = await fetch(`/api/expenses?category_id=${categoryId}`);
        const expenseSums = await expenseResponse.json();

        products.forEach(prod => {
            const currentSum = expenseSums[prod.id] || 0;
            const row = document.createElement("tr");
            row.dataset.productId = prod.id;

            row.innerHTML = `
                <td>${prod.name}</td>
                <td class="current-expense">${currentSum.toFixed(2)} руб</td>
                <td><input type="number" min="0" step="0.01" class="expense-input" placeholder="Введите сумму"></td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("Ошибка загрузки товаров:", err);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const monthSelect = document.getElementById("month-select");

    try {
        const resp = await fetch("/api/last-month");
        const data = await resp.json();

        const savedMonth = data.month_id;
        if (savedMonth) {
            monthSelect.value = savedMonth.toString();
        }
    } catch (err) {
        console.warn("Не удалось загрузить последний месяц:", err);
    }

    monthSelect.addEventListener("change", () => {
        fetchCategories();
    });

    fetchCategories();
});

async function fetchCategories() {
    const monthId = document.getElementById("month-select").value;
    try {
        const response = await fetch(`/api/categories?month_id=${monthId}`);
        const categories = await response.json();

        const container = document.getElementById("categoriesContainer");
        container.innerHTML = "";

        if (categories.length === 0) {
            container.innerHTML = "<p>Категорий нет</p>";
            return;
        }

        categories.forEach(cat => {
            const trimmedName = cat.name;
            const modalId = `modal-${trimmedName.toLowerCase().replace(/\s+/g, '-')}`;
            const blockId = `openModal${trimmedName.replace(/\s+/g, '')}`;

            const newBlock = document.createElement("div");
            newBlock.className = "section_block";
            newBlock.id = blockId;
            newBlock.textContent = trimmedName;

            newBlock.addEventListener("click", function () {
                document.getElementById(modalId).style.display = "block";
                loadProducts(modalId, cat.id);
            });

            container.appendChild(newBlock);

            if (!document.getElementById(modalId)) {
                const { modal } = createModalWithCategory(trimmedName, modalId, cat.id);
                document.body.appendChild(modal);
            }
        });

        updateContainerHeight();
    } catch (err) {
        console.error("Ошибка при загрузке категорий:", err);
    }
}

function createModalWithCategory(categoryName, modalId, categoryId) {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.dataset.categoryId = categoryId;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="resizable-box">
                <div class="text_cont">
                    <div class="name">${categoryName}</div>
                    <div class="button-container">
                        <button class="add-item-btn" data-table="${modalId}-table">Добавить товар</button>
                        <button class="save-expense-btn">Сохранить</button>
                        <button class="close-modal" data-modal="${modalId}">Выход</button>
                    </div>
                </div>
                <table id="${modalId}-table">
                    <thead>
                        <tr>
                            <th>Наименование</th>
                            <th>Текущие траты</th>
                            <th>Внести расходы</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    modal.querySelector('.add-item-btn').addEventListener('click', function () {
        addNewRow(this.getAttribute('data-table'));
    });

    modal.querySelector('.close-modal').addEventListener('click', function () {
        document.getElementById(this.getAttribute('data-modal')).style.display = 'none';
    });

    modal.querySelector('.save-expense-btn').addEventListener('click', async function () {
        const table = modal.querySelector("table");
        const rows = table.querySelectorAll("tbody tr");

        const productNames = [];
        const expenses = {};
        const newProductExpenses = {};
        let messages = [];

        rows.forEach(row => {
            const name = row.cells[0]?.textContent?.trim();
            const productId = row.dataset.productId;
            const input = row.querySelector(".expense-input");

            if (name && !productId) {
                productNames.push(name);
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                    newProductExpenses[name] = value;
                }
            }

            if (productId && input) {
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                    expenses[productId] = value;
                }
            }
        });

        const categoryId = modal.dataset.categoryId;

        try {
            if (productNames.length > 0) {
                const formData = new FormData();
                formData.append("category_id", categoryId);
                formData.append("names", productNames.join(","));

                const response = await fetch("/api/products", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error("Ошибка сохранения товаров");

                const result = await response.json();

                if (result.status === "no_products") {
                    messages.push("Нет новых товаров для сохранения");
                } else if (result.status === "already_exists") {
                    messages.push("Эти товары уже были добавлены");
                } else {
                    messages.push(`Сохранено товаров: ${result.count}`);
                }

                await loadProducts(modalId, categoryId);

                const updatedRows = modal.querySelectorAll("tbody tr");
                updatedRows.forEach(row => {
                    const name = row.cells[0]?.textContent?.trim();
                    const productId = row.dataset.productId;
                    if (newProductExpenses.hasOwnProperty(name)) {
                        expenses[productId] = newProductExpenses[name];
                    }
                });
            }

            if (Object.keys(expenses).length > 0) {
                const expenseForm = new FormData();
                expenseForm.append("category_id", categoryId);
                expenseForm.append("expenses", JSON.stringify(expenses));

                const resp = await fetch("/api/expenses", {
                    method: "POST",
                    body: expenseForm
                });

                if (!resp.ok) throw new Error("Ошибка сохранения трат");

                const res = await resp.json();
                messages.push(`Сохранено трат: ${res.count}`);
            }

            await loadProducts(modalId, categoryId);

            if (messages.length > 0) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        alert(messages.join("\n"));
                    }, 50);
                });
            }

        } catch (err) {
            console.error(err);
            alert("Ошибка при сохранении данных");
        }
    });

    loadProducts(modalId, categoryId);

    return { modal };   
}