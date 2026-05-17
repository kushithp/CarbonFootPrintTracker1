// backend/routes/users.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Register or Sync User
router.post('/sync', async (req, res) => {
  const { firebase_uid, email, name, photo_url } = req.body;

  if (!firebase_uid) {
    return res.status(400).json({ error: "Missing firebase_uid" });
  }

  try {
    let user = await db('users').where({ firebase_uid }).first();
    
    if (!user) {
      const [newUser] = await db('users').insert({
        firebase_uid,
        email,
        name,
        photo_url
      }).returning('*');
      user = newUser;
    } else {
      // Update data if changed
      await db('users').where({ firebase_uid }).update({
        email,
        name,
        photo_url
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("User sync error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
