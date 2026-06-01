// frontend/script.js - Upgraded Analytics and Dashboard script
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

// Count up helper for numbers
function animateCountUp(elementId, start, end, duration) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    
    start = parseFloat(start) || 0;
    end = parseFloat(end) || 0;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = progress * (end - start) + start;
        
        // formats based on tag
        if (obj.classList.contains('value') || elementId.includes('Co2')) {
            obj.innerText = currentVal.toFixed(2);
        } else {
            obj.innerText = Math.round(currentVal);
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            if (obj.classList.contains('value') || elementId.includes('Co2')) {
                obj.innerText = end.toFixed(2);
            } else {
                obj.innerText = Math.round(end);
            }
        }
    };
    window.requestAnimationFrame(step);
}

// Listen for auth state
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        
        // Update UI with User Details
        document.getElementById('userName').innerText = user.displayName || 'Eco-Warrior';
        document.getElementById('userEmail').innerText = user.email;
        document.getElementById('userQuote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
        
        // Load live dynamic date in header
        const headerDateEl = document.getElementById('headerDate');
        if (headerDateEl) {
            headerDateEl.innerText = new Date().toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        if (user.photoURL) {
            document.getElementById('userAvatar').src = user.photoURL;
        } else {
            document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2d6a4f&color=fff`;
        }

        // Update Login/Logout sidebar UI
        const isGuest = user.uid.startsWith('guest_') || user.email === 'guest@carbontracker.com';
        const authNavText = document.getElementById('authNavText');
        const authNavIcon = document.getElementById('authNavIcon');
        
        if (isGuest) {
            if (authNavText) authNavText.innerText = 'Sign In';
            if (authNavIcon) authNavIcon.className = 'fas fa-sign-in-alt';
            
            const roleEl = document.querySelector('.profile-role');
            if (roleEl) roleEl.innerText = 'Eco Guest';
        } else {
            if (authNavText) authNavText.innerText = 'Log Out';
            if (authNavIcon) authNavIcon.className = 'fas fa-sign-out-alt';
            
            const roleEl = document.querySelector('.profile-role');
            if (roleEl) roleEl.innerText = 'Impact Leader';
        }
        
        // Initialize App charts and load analytic data
        initCharts();
        loadDashboardData().then(() => {
            hideLoading();
        });
    }
});

// Sidebar Sign In / Log Out navigation handler
function handleNavAuthClick() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    const isGuest = currentUser.uid.startsWith('guest_') || currentUser.email === 'guest@carbontracker.com';
    if (isGuest) {
        window.location.href = 'login.html';
    } else {
        logoutUser();
    }
}

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

        // Fetch analytical extensions
        const analyticsRes = await fetch(`/api/emissions/analytics/${uid}`);
        const analytics = await analyticsRes.json();

        const comparisonsRes = await fetch(`/api/emissions/comparison/${uid}`);
        const comparisons = await comparisonsRes.json();

        const trendsRes = await fetch(`/api/emissions/trends/${uid}`);
        const trends = await trendsRes.json();

        updateUI(history, summary, analytics, comparisons);
        updateCharts(history, summary, trends);
    } catch (error) {
        console.error("Load dashboard error:", error);
    }
}

// Update UI Elements
function updateUI(history, summary, analytics, comparisons) {
    if (summary) {
        animateCountUp('totalCo2', 0, parseFloat(summary.total || 0), 1000);
        animateCountUp('transportCo2', 0, parseFloat(summary.transport || 0), 1000);
        animateCountUp('energyCo2', 0, parseFloat(summary.electricity || 0), 1000);
        animateCountUp('fuelCo2', 0, parseFloat(summary.fuel || 0), 1000);
        animateCountUp('wasteCo2', 0, parseFloat(summary.waste || 0), 1000);

        // Update progress rating bars in Category section based on shares
        const total = parseFloat(summary.total) || 1;
        document.getElementById('commuteProgress').style.width = `${Math.min(100, (parseFloat(summary.transport || 0) / total) * 100)}%`;
        document.getElementById('electricityProgress').style.width = `${Math.min(100, (parseFloat(summary.electricity || 0) / total) * 100)}%`;
        document.getElementById('fuelProgress').style.width = `${Math.min(100, (parseFloat(summary.fuel || 0) / total) * 100)}%`;
        document.getElementById('wasteProgress').style.width = `${Math.min(100, (parseFloat(summary.waste || 0) / total) * 100)}%`;
    }

    // Update Widget 1: Carbon Index & Planet Condition
    if (analytics) {
        const latest = analytics.latest_emission;
        const levelBadge = document.getElementById('carbonLevelBadge');
        const statusText = document.getElementById('carbonStatusText');
        const latestLogDate = document.getElementById('latestLogDate');

        if (latest) {
            const level = latest.emission_level || 'Low';
            const status = latest.eco_status || 'Eco Friendly 🌿';
            
            levelBadge.innerText = level;
            statusText.innerText = status;
            
            levelBadge.className = 'level-badge';
            if (level === 'Low') levelBadge.classList.add('badge-eco-green');
            else if (level === 'Moderate') levelBadge.classList.add('badge-eco-yellow');
            else if (level === 'High') levelBadge.classList.add('badge-eco-orange');
            else levelBadge.classList.add('badge-eco-red');
            
            latestLogDate.innerText = `Latest: ${new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            levelBadge.innerText = 'LOW';
            levelBadge.className = 'level-badge badge-eco-green';
            statusText.innerText = 'Eco Friendly 🌿';
            latestLogDate.innerText = 'No logs created yet';
        }

        // Earth Planet condition bar
        const planetCondVal = document.getElementById('planetConditionValue');
        const planetConditionProgress = document.getElementById('planetConditionProgress');
        if (planetCondVal && planetConditionProgress) {
            const cond = analytics.planet_condition || "Healthy 🌍";
            planetCondVal.innerText = cond;
            
            let progWidth = "100%";
            if (cond.includes("Healthy")) { 
                progWidth = "95%"; 
                planetConditionProgress.style.background = 'var(--primary)'; 
            } else if (cond.includes("Stressed")) { 
                progWidth = "65%"; 
                planetConditionProgress.style.background = 'var(--warning)'; 
            } else if (cond.includes("Alert")) { 
                progWidth = "40%"; 
                planetConditionProgress.style.background = '#ea580c'; 
            } else { 
                progWidth = "15%"; 
                planetConditionProgress.style.background = 'var(--danger)'; 
            }
            planetConditionProgress.style.width = progWidth;
        }

        // Widget 2: Circular Eco Score Gauge
        const score = latest ? parseInt(latest.eco_score || 100) : 100;
        animateCountUp('ecoScoreVal', 0, score, 850);

        const ring = document.getElementById('ecoScoreRing');
        if (ring) {
            const circumference = 2 * Math.PI * 50; // 314.159
            ring.style.strokeDasharray = circumference;
            const offset = circumference - (score / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }

        const scoreStatusEl = document.getElementById('ecoScoreStatus');
        if (scoreStatusEl) {
            if (score >= 90) {
                scoreStatusEl.innerText = "Excellent 🌿";
                scoreStatusEl.style.color = "var(--primary)";
            } else if (score >= 60) {
                scoreStatusEl.innerText = "Good ⚠️";
                scoreStatusEl.style.color = "var(--warning)";
            } else if (score >= 30) {
                scoreStatusEl.innerText = "Fair 🔥";
                scoreStatusEl.style.color = "#ea580c";
            } else {
                scoreStatusEl.innerText = "Critical 🚨";
                scoreStatusEl.style.color = "var(--danger)";
            }
        }
    }

    // Widget 3: Comparisons metrics lines and Trend status
    if (comparisons) {
        const humanText = comparisons.human && comparisons.human.text ? comparisons.human.text : "No comparison available";
        const prevText = comparisons.previous && comparisons.previous.text ? comparisons.previous.text : "No previous comparison available";
        const weeklyText = comparisons.weekly && comparisons.weekly.text ? comparisons.weekly.text : "No weekly comparison available";

        const humanEl = document.getElementById('comparisonHumanText');
        const prevEl = document.getElementById('comparisonPrevText');
        const weeklyEl = document.getElementById('comparisonWeeklyText');

        if (humanEl) humanEl.innerText = humanText;
        if (prevEl) prevEl.innerText = prevText;
        if (weeklyEl) weeklyEl.innerText = weeklyText;

        const trendBadge = document.getElementById('trendBadge');
        if (trendBadge) {
            const trend = comparisons.previous && comparisons.previous.trend ? comparisons.previous.trend : "stable";
            trendBadge.className = 'trend-badge-pill';
            if (trend === 'decreasing') {
                trendBadge.classList.add('trend-decreasing');
                trendBadge.innerHTML = '<i class="fas fa-arrow-trend-down"></i> <span>Decreasing</span>';
            } else if (trend === 'increasing') {
                trendBadge.classList.add('trend-increasing');
                trendBadge.innerHTML = '<i class="fas fa-arrow-trend-up"></i> <span>Increasing</span>';
            } else {
                trendBadge.style.background = 'var(--border-light)';
                trendBadge.style.color = 'var(--text-muted)';
                trendBadge.innerHTML = '<i class="fas fa-minus"></i> <span>Stable</span>';
            }
        }
    }

    // Update History Table with premium badges and style accents
    const tableBody = document.getElementById('historyTable');
    tableBody.innerHTML = '';
    
    if (!history || history.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fas fa-cubes" style="font-size: 1.5rem; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    No emissions tracked yet. Start recording!
                </td>
            </tr>
        `;
    } else {
        history.forEach(item => {
            const co2Val = parseFloat(item.total_co2 || 0);
            let badgeClass = 'badge-eco-green';
            if (co2Val >= 30) {
                badgeClass = 'badge-eco-red';
            } else if (co2Val >= 15) {
                badgeClass = 'badge-eco-orange';
            } else if (co2Val >= 5) {
                badgeClass = 'badge-eco-yellow';
            }

            const row = `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text);">
                            <i class="far fa-calendar-alt" style="color: var(--primary);"></i>
                            <span>${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </td>
                    <td class="col-highlight">
                        <span class="level-badge ${badgeClass}" style="padding: 4px 10px; font-size: 0.75rem;">${co2Val.toFixed(2)} kg</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-car-side" style="color: var(--info); font-size: 0.8rem;"></i>
                            <span>${parseFloat(item.transport_co2 || 0).toFixed(2)} kg</span>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-bolt" style="color: var(--warning); font-size: 0.8rem;"></i>
                            <span>${parseFloat(item.electricity_co2 || 0).toFixed(2)} kg</span>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-trash-can" style="color: var(--danger); font-size: 0.8rem;"></i>
                            <span>${parseFloat(item.waste_co2 || 0).toFixed(2)} kg</span>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // Update Suggestions Box dynamically from latest entry
    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = '';
    
    if (history && history.length > 0) {
        const latest = history[0];
        const co2Total = parseFloat(latest.total_co2) || 0;
        let count = 0;

        if (co2Total <= 5) {
            addSuggestion('fas fa-spa text-primary', 'Amazing work! Your conscious choices are healing our planet. Keep it up! 🌍💚');
            count++;
        } else {
            const transport = parseFloat(latest.transport_co2) || 0;
            const electricity = parseFloat(latest.electricity_co2) || 0;
            const waste = parseFloat(latest.waste_co2) || 0;

            if (transport > co2Total * 0.25 || transport > 5) {
                addSuggestion('fas fa-bus text-info', 'Travel high: Optimize travels with public transit, bicycling, or carpools.');
                count++;
            }
            if (electricity > co2Total * 0.25 || electricity > 5) {
                addSuggestion('fas fa-plug-circle-bolt text-warning', 'Electricity high: Turn off unneeded standby items, utilize smart LED bulbs.');
                count++;
            }
            if (waste > co2Total * 0.25 || waste > 5) {
                addSuggestion('fas fa-recycle text-danger', 'Waste high: Cut down on single-use items, compost organics, segregate trash.');
                count++;
            }
        }

        if (count === 0) {
            addSuggestion('fas fa-check-circle text-primary', 'Incredible work! Your environmental profile is beautifully optimized.');
        }
    } else {
        suggestionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spa"></i>
                <p>No footprint log recorded yet. Add an entry under the calculator tab to get custom suggestions!</p>
            </div>
        `;
    }
}

function addSuggestion(icon, text) {
    const list = document.getElementById('suggestionsList');
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) {
        list.innerHTML = '';
    }
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
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving emissions...';
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
            status.innerHTML = '<i class="fas fa-circle-check"></i> Emission logged successfully!';
            status.style.color = 'var(--primary)';
            event.target.reset();
            
            // Reload dashboard data
            await loadDashboardData();
            
            // Switch back to overview panel after short delay
            setTimeout(() => {
                showPanel('overview');
                status.style.display = 'none';
            }, 1500);
        }
    } catch (error) {
        status.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Error logging emission. Please check your data.';
        status.style.color = 'var(--danger)';
    }
}

// Panel Switching
function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const targetPanel = document.getElementById(panelId + 'Panel');
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
    if (panelId === 'overview') document.querySelectorAll('.sidebar-nav .nav-item')[0]?.classList.add('active');
    if (panelId === 'track') document.querySelectorAll('.sidebar-nav .nav-item')[1]?.classList.add('active');
    if (panelId === 'history') document.querySelectorAll('.sidebar-nav .nav-item')[2]?.classList.add('active');
}
