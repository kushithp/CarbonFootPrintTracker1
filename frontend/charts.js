// frontend/charts.js - Chart.js logic
let pieChart;
let barChart;

function initCharts() {
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Transport', 'Electricity', 'Fuel', 'Waste'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#2d6a4f', '#40916c', '#95d5b2', '#d8f3dc']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total CO2 (kg)',
                data: [],
                backgroundColor: '#2d6a4f',
                borderRadius: 8
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

function updateCharts(history, summary) {
    // Update Pie Chart from summary
    if (summary) {
        pieChart.data.datasets[0].data = [
            summary.transport || 0,
            summary.electricity || 0,
            summary.fuel || 0,
            summary.waste || 0
        ];
        pieChart.update();
    }

    // Update Bar Chart from last 10 entries
    if (history && history.length > 0) {
        // We want latest first or oldest first? Bar trend usually oldest to newest
        const last10 = history.slice(0, 10).reverse();
        barChart.data.labels = last10.map(item => new Date(item.date).toLocaleDateString());
        barChart.data.datasets[0].data = last10.map(item => item.total_co2);
        barChart.update();
    }
}
