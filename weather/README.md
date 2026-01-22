# Weather Dashboard

This is a small, client-side weather dashboard that uses Open-Meteo's public APIs (no API key required).

How it works
- User enters a city name. The app calls Open-Meteo's Geocoding API to find coordinates.
- It then requests the current weather for those coordinates using the Open-Meteo Forecast API.

Files
- `index.html` — entry point for the dashboard. Open in a browser or host on GitHub Pages.
- `styles.css` — simple styles.
- `app.js` — main JavaScript logic.

Usage
- Place the `weather/` folder in your repository, then open `weather/index.html` in your browser or serve the repository (e.g. `python3 -m http.server`).
- No API key or signup required.

Notes
- This demo is intentionally small and dependency-free.
- You can expand it to show multi-day forecasts, icons, or integrate other APIs.