// frontend/script.js - Dashboard logic
let currentUser = null;

// Quotes for the dashboard
const quotes = [
    "Small steps lead to big changes.",
    "The planet is what we all have in common.",
    "Earth provides enough to satisfy every man's needs.",
    "Be the change you want to see in the world.",
    "Nature does not hurry, yet everything is accomplished.",
    "Growth for the sake of growth is the ideology of the cancer cell."
];

// Apply dark mode if saved
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    const icon = document.getElementById('darkIcon');
    if (icon) icon.className = 'fas fa-sun';
}

// Listen for auth state
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        
        // Update UI with User Details
        document.getElementById('userName').innerText = user.displayName || 'Eco-Warrior';
        document.getElementById('userEmail').innerText = user.email;
        document.getElementById('userQuote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
        
        if (user.photoURL) {
            document.getElementById('userAvatar').src = user.photoURL;
        } else {
            document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2d6a4f&color=fff`;
        }
        
        // Initialize App with real data
        initCharts();
        loadDashboardData().then(() => {
            hideLoading();
        });
    }
});

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
}

// Toggle Dark Mode
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    const icon = document.getElementById('darkIcon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    if (!currentUser) return;

    try {
        const uid = currentUser.uid;
        
        // Fetch History
        const historyRes = await fetch(`/api/emissions/history/${uid}`);
        const history = await historyRes.json();
        
        // Fetch Summary
        const summaryRes = await fetch(`/api/emissions/summary/${uid}`);
        const summary = await summaryRes.json();

        updateUI(history, summary);
        updateCharts(history, summary);
    } catch (error) {
        console.error("Load dashboard error:", error);
    }
}

// Update UI Elements
function updateUI(history, summary) {
    if (summary) {
        document.getElementById('totalCo2').innerText = parseFloat(summary.total || 0).toFixed(2);
        document.getElementById('transportCo2').innerText = parseFloat(summary.transport || 0).toFixed(2);
        document.getElementById('energyCo2').innerText = parseFloat(summary.electricity || 0).toFixed(2);
        document.getElementById('wasteCo2').innerText = parseFloat(summary.waste || 0).toFixed(2);
    }

    // Update History Table
    const tableBody = document.getElementById('historyTable');
    tableBody.innerHTML = '';
    
    history.forEach(item => {
        const row = `
            <tr>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td><strong>${parseFloat(item.total_co2).toFixed(2)} kg</strong></td>
                <td>${parseFloat(item.transport_co2).toFixed(2)}</td>
                <td>${parseFloat(item.electricity_co2).toFixed(2)}</td>
                <td>${parseFloat(item.waste_co2).toFixed(2)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    // Update Suggestions
    const suggestionsList = document.getElementById('suggestionsList');
    if (history.length > 0) {
        // Simplified suggestion logic based on the latest entry's distribution or overall
        const latest = history[0];
        suggestionsList.innerHTML = '';
        
        if (latest.transport_co2 > latest.total_co2 * 0.3) {
            addSuggestion('fas fa-bus', 'Use public transport or carpool for commutes.');
        }
        if (latest.electricity_co2 > latest.total_co2 * 0.3) {
            addSuggestion('fas fa-leaf', 'Switch to energy-efficient appliances.');
        }
        if (latest.waste_co2 > latest.total_co2 * 0.3) {
            addSuggestion('fas fa-recycle', 'Reduce single-use plastics and recycle more.');
        }
        
        if (suggestionsList.innerHTML === '') {
            addSuggestion('fas fa-check-circle', 'Great job! You are maintaining a balanced footprint.');
        }
    }
}

function addSuggestion(icon, text) {
    const list = document.getElementById('suggestionsList');
    list.innerHTML += `
        <div class="suggestion-item">
            <i class="${icon}"></i>
            <p>${text}</p>
        </div>
    `;
}

// Save New Emission
async function saveEmission(event) {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.target);
    const data = {
        firebase_uid: currentUser.uid,
        distance: formData.get('distance'),
        electricity_units: formData.get('electricity_units'),
        liters: formData.get('liters'),
        waste_kg: formData.get('waste_kg'),
        vehicle_type: formData.get('vehicle_type'),
        fuel_type: formData.get('fuel_type')
    };

    const status = document.getElementById('saveStatus');
    status.innerText = 'Saving...';
    status.style.display = 'block';
    status.style.color = 'var(--text-muted)';

    try {
        const response = await fetch('/api/emissions/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            status.innerText = 'Emission saved successfully!';
            status.style.color = 'var(--primary)';
            event.target.reset();
            
            // Reload data
            loadDashboardData();
            
            // Switch back to overview after 1.5s
            setTimeout(() => {
                showPanel('overview');
                status.style.display = 'none';
            }, 1500);
        }
    } catch (error) {
        status.innerText = 'Error saving emission.';
        status.style.color = 'var(--danger)';
    }
}

// Panel Switching
function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    document.getElementById(panelId + 'Panel').style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    // Find which nav item corresponds to this panel
    // This is a simple implementation
    if(panelId === 'overview') document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    if(panelId === 'track') document.querySelector('.nav-item:nth-child(2)').classList.add('active');
    if(panelId === 'history') document.querySelector('.nav-item:nth-child(3)').classList.add('active');
}
