// frontend/charts.js - Upgraded Chart.js logic with multi-metrics, baselines and trends
let pieChart;
let barChart;
let lineChart;

function initCharts() {
    // 1. Emissions Distribution (Pie Chart)
    const pieCanvas = document.getElementById('pieChart');
    if (pieCanvas) {
        if (pieChart) {
            try {
                pieChart.destroy();
            } catch (e) {
                console.warn("Error destroying pieChart:", e);
            }
        }
        const pieCtx = pieCanvas.getContext('2d');
        pieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Transport', 'Electricity', 'Fuel', 'Waste'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#ea580c', '#ef4444'], // Blue, Amber, Orange, Red matching the theme
                    borderWidth: 2,
                    borderColor: 'var(--card-bg)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-muted)',
                            font: { family: 'Inter', weight: '600', size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw.toFixed(2)} kg CO₂`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Weekly comparison vs standard daily human baseline of 12.5kg (Bar Chart)
    const barCanvas = document.getElementById('barChart');
    if (barCanvas) {
        if (barChart) {
            try {
                barChart.destroy();
            } catch (e) {
                console.warn("Error destroying barChart:", e);
            }
        }
        const barCtx = barCanvas.getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Logged Emissions',
                        data: [],
                        backgroundColor: '#059669', // Emerald 600
                        borderRadius: 6,
                        maxBarThickness: 32
                    },
                    {
                        label: 'Average Human (12.5 kg)',
                        data: [],
                        type: 'line',
                        borderColor: '#ef4444', // Danger red line
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-muted)',
                            font: { family: 'Inter', weight: '600' }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: 'var(--border-light)' },
                        ticks: { color: 'var(--text-muted)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-muted)' }
                    }
                }
            }
        });
    }

    // 3. Carbon Emissions and Eco Score Timeline trends (Line Graph with Dual Axes)
    const lineCanvas = document.getElementById('lineChart');
    if (lineCanvas) {
        if (lineChart) {
            try {
                lineChart.destroy();
            } catch (e) {
                console.warn("Error destroying lineChart:", e);
            }
        }
        const lineCtx = lineCanvas.getContext('2d');
        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CO₂ Output (kg)',
                        data: [],
                        borderColor: '#059669', // Emerald
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Eco Score',
                        data: [],
                        borderColor: '#f59e0b', // Amber rating
                        borderWidth: 3,
                        borderDash: [3, 2],
                        tension: 0.35,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'var(--text-muted)',
                            font: { family: 'Inter', weight: '600' }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'CO₂ Emissions (kg)', color: '#059669' },
                        grid: { color: 'var(--border-light)' },
                        ticks: { color: 'var(--text-muted)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Eco Score Index', color: '#f59e0b' },
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false }, // avoid grid lines overlapping
                        ticks: { color: 'var(--text-muted)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-muted)' }
                    }
                }
            }
        });
    }
}

function updateCharts(history, summary, trends) {
    // 1. Update Pie Chart from overall summary
    if (summary && pieChart) {
        pieChart.data.datasets[0].data = [
            parseFloat(summary.transport || 0),
            parseFloat(summary.electricity || 0),
            parseFloat(summary.fuel || 0),
            parseFloat(summary.waste || 0)
        ];
        pieChart.update();
    }

    // 2. Update Weekly comparison bar chart (last 7 logs)
    if (history && history.length > 0 && barChart) {
        const last7 = [...history].slice(0, 7).reverse(); // oldest of last 7 first
        barChart.data.labels = last7.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        barChart.data.datasets[0].data = last7.map(item => parseFloat(item.total_co2 || 0));
        // Fill the constant daily limit baseline (12.5)
        barChart.data.datasets[1].data = Array(last7.length).fill(12.5);
        barChart.update();
    }

    // 3. Update dual-axis Line Chart trends from API data
    if (trends && trends.labels && trends.labels.length > 0 && lineChart) {
        lineChart.data.labels = trends.labels;
        lineChart.data.datasets[0].data = trends.co2_history;
        lineChart.data.datasets[1].data = trends.score_history;
        lineChart.update();
    }
}
