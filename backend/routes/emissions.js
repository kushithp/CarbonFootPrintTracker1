// backend/routes/emissions.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Emission Factors
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
    // 1. Get user ID from firebase_uid
    let user = await db('users').where({ firebase_uid }).first();
    if (!user) {
      // Auto-create user if not exists for simplicity, or return error
      // In this app, we'll try to find them first.
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Calculations
    const transport_co2 = (parseFloat(distance) || 0) * (FACTORS.transport[vehicle_type] || 0.192);
    const electricity_co2 = (parseFloat(electricity_units) || 0) * FACTORS.electricity;
    const fuel_co2 = (parseFloat(liters) || 0) * (FACTORS.fuel[fuel_type] || 2.31);
    const waste_co2 = (parseFloat(waste_kg) || 0) * FACTORS.waste;
    
    const total_co2 = transport_co2 + electricity_co2 + fuel_co2 + waste_co2;

    // 3. Store activity
    const [activity] = await db('activities').insert({
      user_id: user.id,
      distance: parseFloat(distance) || 0,
      electricity: parseFloat(electricity_units) || 0,
      fuel: parseFloat(liters) || 0,
      waste: parseFloat(waste_kg) || 0,
      vehicle_type,
      fuel_type
    }).returning('id');

    // 4. Store emissions
    await db('emissions').insert({
      activity_id: activity.id,
      transport_co2,
      electricity_co2,
      fuel_co2,
      waste_co2,
      total_co2
    });

    // 5. Generate Suggestions
    const suggestions = [];
    if (transport_co2 > total_co2 * 0.3) suggestions.push("Consider using public transport, cycling, or walking for short distances.");
    if (electricity_co2 > total_co2 * 0.3) suggestions.push("Switch to LED bulbs and turn off appliances when not in use.");
    if (waste_co2 > total_co2 * 0.3) suggestions.push("Start composting organic waste and recycling plastic/paper.");

    if (suggestions.length === 0) suggestions.push("Great job! Keep maintaining your low carbon footprint lifestyle.");

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
        'emissions.waste_co2'
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

export default router;
