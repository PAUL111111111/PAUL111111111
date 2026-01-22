// Weather dashboard using Open-Meteo (no API key required)

const $ = id => document.getElementById(id);
const form = $('searchForm');
const q = $('q');
const result = $('result');
const errorBox = $('error');

const locationNameEl = $('locationName');
const locationCoordsEl = $('locationCoords');
const temperatureEl = $('temperature');
const weatherDescEl = $('weatherDesc');
const windEl = $('wind');
const timeEl = $('time');
const weatherIconEl = $('weatherIcon');

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const query = q.value.trim();
  if (!query) return;
  showError('');
  showResult(false);
  try {
    showError('Loading...');
    const geo = await geocode(query);
    if (!geo) {
      showError('Location not found');
      return;
    }
    const weather = await fetchWeather(geo.latitude, geo.longitude);
    if (!weather) {
      showError('Weather data unavailable');
      return;
    }
    render(geo, weather);
    showError('');
    showResult(true);
  } catch (err) {
    console.error(err);
    showError('An error occurred while fetching data');
  }
});

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data || !data.results || data.results.length === 0) return null;
  return data.results[0];
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  return data.current_weather || null;
}

function render(geo, weather) {
  locationNameEl.textContent = geo.name + (geo.country ? `, ${geo.country}` : '');
  locationCoordsEl.textContent = `Lat ${geo.latitude.toFixed(3)}, Lon ${geo.longitude.toFixed(3)}`;
  temperatureEl.textContent = `${weather.temperature.toFixed(1)} °C`;
  weatherDescEl.textContent = weatherCodeToText(weather.weathercode);
  windEl.textContent = `${weather.windspeed} km/h • ${windDirection(weather.winddirection)}`;
  timeEl.textContent = new Date(weather.time).toLocaleString();
  weatherIconEl.textContent = weatherCodeToEmoji(weather.weathercode);
}

function showResult(visible) {
  if (visible) result.classList.remove('hidden'); else result.classList.add('hidden');
}
function showError(msg) {
  if (!msg) { errorBox.classList.add('hidden'); errorBox.textContent = ''; return; }
  errorBox.classList.remove('hidden'); errorBox.textContent = msg;
}

// Minimal weathercode -> description mapping (Open-Meteo codes)
function weatherCodeToText(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return map[code] || 'Unknown';
}

function weatherCodeToEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if ([45,48].includes(code)) return '🌫️';
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return '🌧️';
  if ([56,57,66,67,71,73,75,77,85,86].includes(code)) return '❄️';
  if ([95,96,99].includes(code)) return '⛈️';
  return '🔆';
}

function windDirection(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const ix = Math.round((deg % 360) / 22.5) % 16;
  return dirs[ix];
}