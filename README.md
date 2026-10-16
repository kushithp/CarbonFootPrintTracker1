# Carbon Footprint Tracker

This is a small full-stack app for recording everyday activities and estimating the carbon emissions linked to them. You can enter things like travel distance, electricity use, fuel, and waste, then see an estimated total and some suggestions for reducing it.

The project uses a simple HTML/CSS/JavaScript frontend with an Express backend. Firebase is used for authentication, and the backend stores activity and emissions data in a database.

## What it includes

- Login and user authentication with Firebase
- A dashboard for entering activity data
- Estimated emissions for transport, electricity, fuel, and waste
- Charts to help compare emissions
- A basic eco-score and activity trend
- Suggestions based on the categories contributing to the total
- API routes for user and emissions data

The calculations use emission factors defined in `backend/routes/emissions.js`. These are estimates and can vary by location, energy source, vehicle, and other factors, so the results should be treated as a guide rather than an exact measurement.

## Tech used

- HTML, CSS and JavaScript
- Node.js and Express
- Firebase Authentication
- PostgreSQL-compatible database access through Knex
- Chart.js
- dotenv for environment configuration

## Project structure

```text
CarbonFootPrintTracker1-main/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── auth.js
│   ├── script.js
│   ├── charts.js
│   └── style.css
├── backend/
│   ├── server.js
│   ├── db.js
│   └── routes/
│       ├── emissions.js
│       └── users.js
├── database/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```

## Run it locally

You'll need Node.js and npm installed.

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd CarbonFootPrintTracker1-main
```

Replace `<YOUR_REPOSITORY_URL>` with your repository's URL.

### 2. Install packages

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file from `.env.example` and fill in the values for your own services.

macOS / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set up Firebase Authentication and your database, then use your own credentials in the local environment. The database schema is in `database/schema.sql`.

**Do not commit real API keys, database passwords, or other secrets to GitHub.** If a real credential has already been pushed to a repository, rotate it with the provider; removing it from the current file does not make the old credential safe again.

### 4. Start the app

```bash
npm run dev
```

The server is configured to run at:

```text
http://localhost:3000
```

There is also a health-check endpoint at `http://localhost:3000/api/health`.

## Database

The schema file defines tables for users, activities, and emissions. Apply it to the PostgreSQL database configured for your environment before using the parts of the app that save activity data.

Make sure the connection string matches the database driver and configuration in `backend/db.js`.

## A few notes

- Emissions are calculated using fixed factors in the backend code. Update them if you have more appropriate factors for your region or use case.
- The eco-score is a project-specific indicator, not an official environmental rating.
- Authentication and database permissions should be reviewed before deploying the app publicly.
- The current repository is a starting point, so test login, saving records, and chart updates in your own environment before relying on them.

## Ideas for later

- Add tests for the emission calculations and API routes
- Let users export their activity history
- Make the emission factors configurable by region
- Improve validation and error messages for incomplete or invalid input
- Add clearer setup and deployment instructions

## Contributing

If you spot a bug or want to add something, open an issue or submit a pull request.
