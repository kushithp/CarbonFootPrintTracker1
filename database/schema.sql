-- Carbon Footprint Tracker - Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    distance FLOAT DEFAULT 0,
    electricity FLOAT DEFAULT 0,
    fuel FLOAT DEFAULT 0,
    waste FLOAT DEFAULT 0,
    vehicle_type VARCHAR(50),
    fuel_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emissions Table
CREATE TABLE IF NOT EXISTS emissions (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    transport_co2 FLOAT DEFAULT 0,
    electricity_co2 FLOAT DEFAULT 0,
    fuel_co2 FLOAT DEFAULT 0,
    waste_co2 FLOAT DEFAULT 0,
    total_co2 FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
