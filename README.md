# Carbon Footprint Tracker - Full Stack Professional

A professional, full-stack application built with Node.js, Supabase (PostgreSQL), and Firebase Authentication.

## Project Structure

```
project-root/
│
├── frontend/           # Vanilla JS Frontend
│   ├── index.html      # Landing Page
│   ├── dashboard.html  # User Dashboard
│   ├── login.html      # Auth Page (Login/Signup)
│   ├── style.css       # Global Styles
│   ├── script.js       # Dashboard Logic
│   ├── charts.js       # Chart.js Integration
│   ├── auth.js         # Firebase Auth Logic
│   └── assets/         # Images & Icons
│
├── backend/            # Express.js Backend
│   ├── server.js       # Backend Entry & App Config
│   ├── db.js           # Database Connection
│   ├── routes/         # API Routes
│   │   ├── emissions.js
│   │   └── users.js
│   ├── controllers/    # Route Logic (Optional expansion)
│   ├── models/         # DB Models (Optional expansion)
│   └── middleware/     # Custom Middlewares
│
├── database/           # Database Scripts
│   └── schema.sql      # PostgreSQL Schema
│
└── README.md
```

## Features

- **Authentication**: Fully integrated Firebase Authentication for secure access.
- **Relational Storage**: Connects to Supabase PostgreSQL for persistent data.
- **Accurate Formulas**: Uses standard emission factors for precise CO2 tracking.
- **Data Visualisation**: Dynamic Pie and Bar charts using Chart.js.
- **Eco-Suggestions**: Intelligent tips based on your emission profile.

## Getting Started

1. **Setup Database**: Use the `database/schema.sql` to create tables in your Supabase project.
2. **Environment**: Ensure your `.env` file or environment variables include `DATABASE_URL`.
3. **Install Dependencies**: `npm install`
4. **Run Application**: `npm run dev`

The application will be available at `http://localhost:3000`.
