# Security Dashboard Frontend

This frontend connects to the Express backend at http://localhost:3000 by default.

Quick start (local):
1. Backend:
   - cd security-backend
   - npm install
   - npm run init-db    # creates SQLite DB
   - (copy .env.example to .env and set JWT_SECRET if desired)
   - npm start

2. Frontend:
   - Serve the `security-frontend/` folder or open `security-frontend/index.html` directly.
   - Simple static server: from repository root run `python3 -m http.server 8000` then open:
     http://localhost:8000/security-frontend/index.html

Behavior:
- Register a user and login. The frontend will send a record-login request after successful auth.
- Dashboard shows stats, a device-distribution chart, a map of parsed locations, a recent logins table, and monthly plans.

Security notes:
- This is a demo. For production:
  - Always deploy backend behind HTTPS.
  - Use a managed database (Postgres, MySQL, etc.) instead of local SQLite for multi-instance deployments.
  - Use a strong JWT_SECRET and rotate it; store secrets in environment variables or a secrets manager.
  - Add input validation, CSRF protections as appropriate, and stricter rate-limiting.
  - Consider using refresh tokens or short-lived access tokens and revocation strategy.
  - Sanitize or avoid storing raw user-agent/location strings if privacy-sensitive.