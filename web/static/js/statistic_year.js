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

let categoryChart, yearlyChart;

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

async function fetchAndRenderCharts() {
    const monthSelect = document.getElementById("month-select");
    const monthName = monthSelect.value;
    const monthId = monthIdMap[monthName];

    document.getElementById("category-title").textContent = "Категории: " + capitalizeRuMonth(monthName);

    try {
        const [categoryRes, yearRes] = await Promise.all([
            fetch(`/api/stat/categories-by-month?month_id=${monthId}`),
            fetch(`/api/stat/by-months`)
        ]);

        const categoryData = await categoryRes.json();
        const yearData = await yearRes.json();

        updateChart(categoryChart, categoryData);
        updateChart(yearlyChart, yearData);
    } catch (err) {
        console.error("Ошибка загрузки данных:", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const monthSelect = document.getElementById("month-select");

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

    yearlyChart = new Chart(ctx2, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true }
    });

    monthSelect.addEventListener("change", fetchAndRenderCharts);
    await fetchAndRenderCharts();
});