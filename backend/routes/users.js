// backend/routes/users.js
import express from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = express.Router();

// Helper to hash password using SHA-256
function hashPassword(password) {
  if (!password) return '';
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Custom Local Sign Up
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing email, password, or name" });
  }

  try {
    // 1. Check if email is already taken
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    // 2. Hash password and generate a unique user ID
    const hashedPassword = hashPassword(password);
    const customUid = 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const defaultPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2d6a4f&color=fff`;

    // 3. Insert user into Database
    const [newUser] = await db('users').insert({
      firebase_uid: customUid,
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      photo_url: defaultPhotoURL
    }).returning('*');

    res.json({
      success: true,
      user: {
        uid: newUser.firebase_uid,
        displayName: newUser.name,
        email: newUser.email,
        photoURL: newUser.photo_url
      }
    });

  } catch (error) {
    console.error("User signup error:", error);
    res.status(500).json({ error: "Failed to create user account" });
  }
});

// Custom Local Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    // 1. Find user by email
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 2. Validate password (hashed)
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      success: true,
      user: {
        uid: user.firebase_uid,
        displayName: user.name,
        email: user.email,
        photoURL: user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2d6a4f&color=fff`
      }
    });

  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

// Register or Sync User (Failsafe for existing dependencies)
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
