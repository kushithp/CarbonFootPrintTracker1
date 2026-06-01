// backend/routes/emissions.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Emission Factors (kg CO2 per unit)
const FACTORS = {
  transport: {
    petrol_car: 0.192,
    diesel_car: 0.171,
    bike: 0.103,
    bus: 0.089
  },
  electricity: 0.82,
  fuel: {
    petrol: 2.31,
    diesel: 2.68
  },
  waste: 0.5
};

// POST /save - Save user activity and emissions
router.post('/save', async (req, res) => {
  const { 
    firebase_uid, 
    distance, 
    electricity_units, 
    liters, 
    waste_kg, 
    vehicle_type, 
    fuel_type 
  } = req.body;

  if (!firebase_uid) {
    return res.status(400).json({ error: "Missing firebase_uid" });
  }

  try {
    // 1. Get user ID from firebase_uid (auto-create if not exists for guest/review flow)
    let user = await db('users').where({ firebase_uid }).first();
    if (!user) {
      await db('users').insert({
        firebase_uid,
        email: 'guest@carbontracker.com',
        name: 'Eco Guest',
        photo_url: 'https://ui-avatars.com/api/?name=Eco+Guest&background=2d6a4f&color=fff'
      });
      user = await db('users').where({ firebase_uid }).first();
    }

    // 2. Calculations
    const transport_co2 = (parseFloat(distance) || 0) * (FACTORS.transport[vehicle_type] || 0.192);
    const electricity_co2 = (parseFloat(electricity_units) || 0) * FACTORS.electricity;
    const fuel_co2 = (parseFloat(liters) || 0) * (FACTORS.fuel[fuel_type] || 2.31);
    const waste_co2 = (parseFloat(waste_kg) || 0) * FACTORS.waste;
    
    const total_co2 = transport_co2 + electricity_co2 + fuel_co2 + waste_co2;

    // Classification Levels
    let level = 'Low';
    let status = 'Eco Friendly 🌿';
    let score = 100;

    if (total_co2 <= 5) {
      level = 'Low';
      status = 'Eco Friendly 🌿';
      score = Math.round(100 - (total_co2 / 5) * 10); // 0 -> 100, 5 -> 90
    } else if (total_co2 <= 15) {
      level = 'Moderate';
      status = 'Normal ⚠️';
      score = Math.round(80 - ((total_co2 - 5) / 10) * 20); // 5 -> 80, 15 -> 60
    } else if (total_co2 <= 30) {
      level = 'High';
      status = 'Harmful 🔥';
      score = Math.round(50 - ((total_co2 - 15) / 15) * 20); // 15 -> 50, 30 -> 30
    } else {
      level = 'Very High';
      status = 'Dangerous 🚨';
      score = Math.round(Math.max(0, 20 - ((total_co2 - 30) / 30) * 20)); // 30 -> 20, 60+ -> 0
    }
    score = Math.max(0, Math.min(100, score));

    // Get the previous record of this user to compute comparison_percentage and trend_status
    let comparison_percentage = 0;
    let trend_status = 'stable';
    
    const lastEmission = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .where('activities.user_id', user.id)
      .orderBy('activities.created_at', 'desc')
      .first();
      
    if (lastEmission) {
      const prev_co2 = parseFloat(lastEmission.total_co2) || 0;
      if (prev_co2 > 0) {
        comparison_percentage = ((total_co2 - prev_co2) / prev_co2) * 100;
      }
      trend_status = total_co2 > prev_co2 ? 'increasing' : (total_co2 < prev_co2 ? 'decreasing' : 'stable');
    }

    // 3. Store activity
    const insertedIds = await db('activities').insert({
      user_id: user.id,
      distance: parseFloat(distance) || 0,
      electricity: parseFloat(electricity_units) || 0,
      fuel: parseFloat(liters) || 0,
      waste: parseFloat(waste_kg) || 0,
      vehicle_type,
      fuel_type
    });

    let activityId = insertedIds && insertedIds[0];
    if (!activityId) {
      // Fallback: select the latest activity entered by this user
      const latestActivity = await db('activities')
        .where('user_id', user.id)
        .orderBy('id', 'desc')
        .first();
      activityId = latestActivity ? latestActivity.id : null;
    } else if (typeof activityId === 'object') {
      activityId = activityId.id;
    }

    // 4. Store emissions
    await db('emissions').insert({
      activity_id: activityId,
      transport_co2,
      electricity_co2,
      fuel_co2,
      waste_co2,
      total_co2,
      emission_level: level,
      eco_status: status,
      comparison_percentage,
      trend_status,
      eco_score: score
    });

    // 5. Generate Suggestions
    const suggestions = [];
    if (transport_co2 > total_co2 * 0.25) suggestions.push("Consider using public transport, cycling, or walking for short distances.");
    if (electricity_co2 > total_co2 * 0.25) suggestions.push("Switch to LED bulbs and turn off appliances when not in use.");
    if (waste_co2 > total_co2 * 0.25) suggestions.push("Start composting organic waste and recycling plastic/paper.");

    if (total_co2 <= 5) {
      suggestions.push("Amazing work! Your conscious choices are healing our planet. Keep it up! 🌍💚");
    } else if (suggestions.length === 0) {
      suggestions.push("Great job! Keep maintaining your low carbon footprint lifestyle.");
    }

    res.json({ 
      success: true, 
      results: {
        total_co2: total_co2.toFixed(2),
        breakdown: {
          transport: transport_co2.toFixed(2),
          electricity: electricity_co2.toFixed(2),
          fuel: fuel_co2.toFixed(2),
          waste: waste_co2.toFixed(2)
        },
        emission_level: level,
        eco_status: status,
        eco_score: score,
        trend_status,
        suggestions
      }
    });

  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /history/:uid - Fetch user history
router.get('/history/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    const history = await db('activities')
      .join('users', 'activities.user_id', 'users.id')
      .join('emissions', 'activities.id', 'emissions.activity_id')
      .where('users.firebase_uid', uid)
      .select(
        'activities.id',
        'activities.created_at as date',
        'activities.distance',
        'activities.electricity',
        'activities.fuel',
        'activities.waste',
        'activities.vehicle_type',
        'activities.fuel_type',
        'emissions.total_co2',
        'emissions.transport_co2',
        'emissions.electricity_co2',
        'emissions.fuel_co2',
        'emissions.waste_co2',
        'emissions.emission_level',
        'emissions.eco_status',
        'emissions.comparison_percentage',
        'emissions.trend_status',
        'emissions.eco_score'
      )
      .orderBy('activities.created_at', 'desc')
      .limit(20);

    res.json(history);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// GET /summary/:uid - Return total emissions summary
router.get('/summary/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    const summary = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .join('users', 'activities.user_id', 'users.id')
      .where('users.firebase_uid', uid)
      .sum({ 
        total: 'total_co2',
        transport: 'transport_co2',
        electricity: 'electricity_co2',
        fuel: 'fuel_co2',
        waste: 'waste_co2'
      })
      .first();

    res.json(summary);
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Analytics handlers
const getAnalytics = async (req, res) => {
  const uid = req.params.uid || req.query.uid;
  if (!uid) return res.status(400).json({ error: "Missing uid parameter" });

  try {
    const user = await db('users').where({ firebase_uid: uid }).first();
    if (!user) {
      return res.json({
        total_logs_count: 0,
        average_score: 100,
        planet_condition: "Healthy 🌍",
        latest_emission: null,
        summary: { total: 0, transport: 0, electricity: 0, fuel: 0, waste: 0 }
      });
    }

    const logs = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .where('activities.user_id', user.id)
      .select('emissions.*', 'activities.created_at as date')
      .orderBy('activities.created_at', 'desc');

    const summary = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .where('activities.user_id', user.id)
      .sum({ 
        total: 'total_co2',
        transport: 'transport_co2',
        electricity: 'electricity_co2',
        fuel: 'fuel_co2',
        waste: 'waste_co2'
      })
      .first();

    const totalLogs = logs.length;
    let avgScore = 100;
    let planetCondition = "Healthy 🌍";
    let latestEmission = null;

    if (totalLogs > 0) {
      // Backfill missing values of older logs in-memory
      logs.forEach(l => {
        if (!l.eco_score) {
          const tot = parseFloat(l.total_co2) || 0;
          if (tot <= 5) {
            l.eco_score = Math.round(100 - (tot / 5) * 10);
            l.emission_level = 'Low';
            l.eco_status = 'Eco Friendly 🌿';
          } else if (tot <= 15) {
            l.eco_score = Math.round(80 - ((tot - 5) / 10) * 20);
            l.emission_level = 'Moderate';
            l.eco_status = 'Normal ⚠️';
          } else if (tot <= 30) {
            l.eco_score = Math.round(50 - ((tot - 15) / 15) * 20);
            l.emission_level = 'High';
            l.eco_status = 'Harmful 🔥';
          } else {
            l.eco_score = Math.round(Math.max(0, 20 - ((tot - 30) / 30) * 20));
            l.emission_level = 'Very High';
            l.eco_status = 'Dangerous 🚨';
          }
        }
      });

      const sumScore = logs.reduce((acc, log) => acc + (log.eco_score || 100), 0);
      avgScore = Math.round(sumScore / totalLogs);
      
      if (avgScore >= 80) planetCondition = "Healthy 🌍";
      else if (avgScore >= 60) planetCondition = "Stressed ☁️";
      else if (avgScore >= 35) planetCondition = "Alert ⚠️";
      else planetCondition = "Critical 🚨";

      latestEmission = logs[0];
    }

    res.json({
      total_logs_count: totalLogs,
      average_score: avgScore,
      planet_condition: planetCondition,
      latest_emission: latestEmission,
      summary: {
        total: parseFloat(summary.total || 0).toFixed(2),
        transport: parseFloat(summary.transport || 0).toFixed(2),
        electricity: parseFloat(summary.electricity || 0).toFixed(2),
        fuel: parseFloat(summary.fuel || 0).toFixed(2),
        waste: parseFloat(summary.waste || 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error("Analytics route error:", error);
    res.status(500).json({ error: "Failed to load analytics" });
  }
};

router.get('/analytics/:uid', getAnalytics);
router.get('/analytics', getAnalytics);

// Comparisons route
const getComparison = async (req, res) => {
  const uid = req.params.uid || req.query.uid;
  if (!uid) return res.status(400).json({ error: "Missing uid parameter" });

  try {
    const user = await db('users').where({ firebase_uid: uid }).first();
    if (!user) {
      return res.json({
        human: { percentage: 0, text: "No logs tracked yet." },
        previous: { percentage: 0, text: "No logs tracked yet.", trend: "stable" },
        weekly: { percentage: 0, text: "No logs tracked yet." }
      });
    }

    const logs = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .where('activities.user_id', user.id)
      .select('emissions.*', 'activities.created_at as date')
      .orderBy('activities.created_at', 'desc');

    if (logs.length === 0) {
      return res.json({
        human: { percentage: 0, text: "No logs tracked yet." },
        previous: { percentage: 0, text: "No logs tracked yet.", trend: "stable" },
        weekly: { percentage: 0, text: "No logs tracked yet." }
      });
    }

    const latest = logs[0];
    const latestCo2 = parseFloat(latest.total_co2) || 0;

    // 1. Human comparison (Baseline: 12.5 kg)
    const baselineHuman = 12.5;
    const humanDiffPercent = ((latestCo2 - baselineHuman) / baselineHuman) * 100;
    const humanDiffText = humanDiffPercent <= 0
      ? `You emit ${Math.abs(humanDiffPercent).toFixed(1)}% less than the daily human average (12.5kg)`
      : `You emit ${humanDiffPercent.toFixed(1)}% more than the daily human average (12.5kg)`;

    // 2. Previous comparison
    let prevDiffPercent = 0;
    let prevDiffText = "First log tracked! Excellent start.";
    let trend = "stable";

    if (logs.length > 1) {
      const prev = logs[1];
      const prevCo2 = parseFloat(prev.total_co2) || 0;
      if (prevCo2 > 0) {
        prevDiffPercent = ((latestCo2 - prevCo2) / prevCo2) * 100;
      }
      trend = latestCo2 > prevCo2 ? "increasing" : (latestCo2 < prevCo2 ? "decreasing" : "stable");
      prevDiffText = prevDiffPercent >= 0
        ? `Your emissions increased by ${prevDiffPercent.toFixed(1)}% since your last log`
        : `Your emissions decreased by ${Math.abs(prevDiffPercent).toFixed(1)}% since your last log`;
    }

    // 3. Weekly comparison (logs in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Calculate average of logs in last 7 days
    const weeklyLogs = logs.filter(log => new Date(log.date) >= sevenDaysAgo);
    let weeklyAvg = 0;
    let weeklyDiffPercent = 0;
    let weeklyDiffText = "";

    if (weeklyLogs.length > 0) {
      const sumCo2 = weeklyLogs.reduce((acc, l) => acc + (parseFloat(l.total_co2) || 0), 0);
      weeklyAvg = sumCo2 / weeklyLogs.length;
      
      if (weeklyAvg > 0) {
        weeklyDiffPercent = ((latestCo2 - weeklyAvg) / weeklyAvg) * 100;
      }
      weeklyDiffText = weeklyDiffPercent >= 0
        ? `Your current emissions are ${weeklyDiffPercent.toFixed(1)}% higher than your weekly average (${weeklyAvg.toFixed(1)}kg)`
        : `Your current emissions are ${Math.abs(weeklyDiffPercent).toFixed(1)}% lower than your weekly average (${weeklyAvg.toFixed(1)}kg)`;
    } else {
      // Fallback to average of all logs
      const sumAll = logs.reduce((acc, l) => acc + (parseFloat(l.total_co2) || 0), 0);
      weeklyAvg = sumAll / logs.length;
      if (weeklyAvg > 0) {
        weeklyDiffPercent = ((latestCo2 - weeklyAvg) / weeklyAvg) * 100;
      }
      weeklyDiffText = weeklyDiffPercent >= 0
        ? `Your current emissions are ${weeklyDiffPercent.toFixed(1)}% higher than your historical average (${weeklyAvg.toFixed(1)}kg)`
        : `Your current emissions are ${Math.abs(weeklyDiffPercent).toFixed(1)}% lower than your historical average (${weeklyAvg.toFixed(1)}kg)`;
    }

    res.json({
      human: { percentage: isNaN(humanDiffPercent) ? 0 : humanDiffPercent, text: humanDiffText },
      previous: { percentage: isNaN(prevDiffPercent) ? 0 : prevDiffPercent, text: prevDiffText, trend },
      weekly: { percentage: isNaN(weeklyDiffPercent) ? 0 : weeklyDiffPercent, text: weeklyDiffText }
    });
  } catch (error) {
    console.error("Comparison route error:", error);
    res.status(500).json({ error: "Failed to load comparisons" });
  }
};

router.get('/comparison/:uid', getComparison);
router.get('/comparison', getComparison);

// Trends route
const getTrends = async (req, res) => {
  const uid = req.params.uid || req.query.uid;
  if (!uid) return res.status(400).json({ error: "Missing uid parameter" });

  try {
    const user = await db('users').where({ firebase_uid: uid }).first();
    if (!user) {
      return res.json({ labels: [], co2_history: [], score_history: [] });
    }

    const logs = await db('emissions')
      .join('activities', 'emissions.activity_id', 'activities.id')
      .where('activities.user_id', user.id)
      .select('emissions.*', 'activities.created_at as date')
      .orderBy('activities.created_at', 'asc') // chronological order!
      .limit(10); // last 10 entries

    // Ensure older logic entries have backup eco_score values
    logs.forEach(l => {
      if (!l.eco_score) {
        const tot = parseFloat(l.total_co2) || 0;
        if (tot <= 5) {
          l.eco_score = Math.round(100 - (tot / 5) * 10);
        } else if (tot <= 15) {
          l.eco_score = Math.round(80 - ((tot - 5) / 10) * 20);
        } else if (tot <= 30) {
          l.eco_score = Math.round(50 - ((tot - 15) / 15) * 20);
        } else {
          l.eco_score = Math.round(Math.max(0, 20 - ((tot - 30) / 30) * 20));
        }
      }
    });

    const labels = logs.map(l => new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const co2History = logs.map(l => parseFloat(l.total_co2 || 0));
    const scoreHistory = logs.map(l => parseInt(l.eco_score || 100));
    
    const transportHistory = logs.map(l => parseFloat(l.transport_co2 || 0));
    const electricityHistory = logs.map(l => parseFloat(l.electricity_co2 || 0));
    const fuelHistory = logs.map(l => parseFloat(l.fuel_co2 || 0));
    const wasteHistory = logs.map(l => parseFloat(l.waste_co2 || 0));

    res.json({
      labels,
      co2_history: co2History,
      score_history: scoreHistory,
      breakdown: {
        transport: transportHistory,
        electricity: electricityHistory,
        fuel: fuelHistory,
        waste: wasteHistory
      }
    });
  } catch (error) {
    console.error("Trends route error:", error);
    res.status(500).json({ error: "Failed to load trends" });
  }
};

router.get('/trends/:uid', getTrends);
router.get('/trends', getTrends);

export default router;
