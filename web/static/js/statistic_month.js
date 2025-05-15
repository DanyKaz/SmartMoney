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

let categoryChart, monthlyChart;
let currentCategoryId = null;

const monthIdMap = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

const reverseMonthIdMap = Object.entries(monthIdMap)
    .reduce((acc, [k, v]) => { acc[v] = k; return acc; }, {});

function capitalizeRuMonth(monthEng) {
    const ruMap = {
        january: "Январь", february: "Февраль", march: "Март", april: "Апрель",
        may: "Май", june: "Июнь", july: "Июль", august: "Август",
        september: "Сентябрь", october: "Октябрь", november: "Ноябрь", december: "Декабрь"
    };
    return ruMap[monthEng] || "Месяц";
}

function updateChart(chart, dataMap) {
    const labels = Object.keys(dataMap);
    const data = Object.values(dataMap);
    const colors = [
    '#FF6633', '#FF33FF', '#FFFF99', '#00B3E6', '#6666FF',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
    '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', 
    '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
    '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', 
    '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
    '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', 
    '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
    '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
    '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#FFB399',
    ];

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
    chart.update();
}

async function loadCategoriesAndStats() {
    const monthName = document.getElementById('month-select').value;
    const monthId = monthIdMap[monthName];

    document.getElementById("monthly-title").textContent = "Расходы за " + capitalizeRuMonth(monthName);

    try {
        const catResp = await fetch(`/api/categories/by-month?month_id=${monthId}`);
        const categories = await catResp.json();

        const catSelect = document.getElementById('category-select');
        catSelect.innerHTML = "";

        if (categories.length === 0) {
            catSelect.innerHTML = "<option disabled>Нет категорий</option>";
            updateChart(categoryChart, {});
            updateChart(monthlyChart, {});
            document.getElementById("category-title").textContent = "Категория: —";
            return;
        }

        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.name;
            catSelect.appendChild(opt);
        });

        currentCategoryId = categories[0].id;
        document.getElementById("category-title").textContent = "Категория: " + categories[0].name;

        await fetchAndRenderStats(monthId, currentCategoryId);
    } catch (err) {
        console.error("Ошибка загрузки категорий:", err);
    }
}

async function fetchAndRenderStats(monthId, categoryId) {
    try {
        const [monthlyRes, categoryRes] = await Promise.all([
            fetch(`/api/stat/monthly?month_id=${monthId}`),
            fetch(`/api/stat/category?month_id=${monthId}&category_id=${categoryId}`)
        ]);

        const monthlyData = await monthlyRes.json();
        const categoryData = await categoryRes.json();

        updateChart(monthlyChart, monthlyData);
        updateChart(categoryChart, categoryData);
    } catch (err) {
        console.error("Ошибка при загрузке графиков:", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const monthSelect = document.getElementById('month-select');
    const categorySelect = document.getElementById('category-select');

    try {
        const resp = await fetch("/api/last-month");
        const data = await resp.json();

        const monthId = data.month_id || 1;
        const monthKey = reverseMonthIdMap[monthId] || "january";
        monthSelect.value = monthKey;
    } catch (err) {
        console.warn("Не удалось загрузить последний месяц, выбрано значение по умолчанию");
        monthSelect.value = "january";
    }

    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    const ctx2 = document.getElementById('monthlyChart').getContext('2d');

    categoryChart = new Chart(ctx1, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true }
    });

    monthlyChart = new Chart(ctx2, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true }
    });

    monthSelect.addEventListener('change', () => {
        loadCategoriesAndStats();
    });

    categorySelect.addEventListener('change', () => {
        const monthId = monthIdMap[monthSelect.value];
        const categoryId = parseInt(categorySelect.value);
        if (categoryId) {
            currentCategoryId = categoryId;
            const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
            document.getElementById("category-title").textContent = "Категория: " + categoryName;
            fetchAndRenderStats(monthId, categoryId);
        }
    });

    await loadCategoriesAndStats();
});