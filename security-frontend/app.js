// Default API base - change if backend is hosted elsewhere
const API = 'http://localhost:3000';

let token = localStorage.getItem('t') || null;
const authSection = document.getElementById('auth');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('authForm');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showLoginBtn = document.getElementById('showLogin');

function setAuth(t) {
  token = t;
  if (t) {
    localStorage.setItem('t', t);
    dashboard.classList.remove('hidden');
    authSection.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    showLoginBtn.classList.add('hidden');
    loadDashboard();
  } else {
    localStorage.removeItem('t');
    token = null;
    dashboard.classList.add('hidden');
    authSection.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    showLoginBtn.classList.remove('hidden');
  }
}

showLoginBtn.addEventListener('click', () => { authSection.classList.toggle('hidden'); });
logoutBtn.addEventListener('click', () => { setAuth(null); });

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const res = await fetch(API + '/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await res.json();
  if (data.token) {
    setAuth(data.token);
    await recordLogin('success');
  } else alert(data.error || 'Login failed');
});

registerBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const res = await fetch(API + '/api/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await res.json();
  if (data.token) { setAuth(data.token); await recordLogin('success'); } else { alert(data.error || 'Register failed'); }
});

async function loadDashboard() {
  try {
    const headers = { 'Authorization': 'Bearer ' + token };
    const st = await (await fetch(API + '/api/stats', { headers })).json();
    document.getElementById('totalLogins').textContent = st.total || 0;
    document.getElementById('last7').textContent = st.last7 || 0;
    document.getElementById('failed').textContent = st.failed || 0;
    document.getElementById('uniqueDevices').textContent = st.uniqueDevices || 0;

    const deviceLabels = st.byDevice.map(d => d.device || 'unknown');
    const deviceCounts = st.byDevice.map(d => d.count);
    renderDeviceChart(deviceLabels, deviceCounts);

    const records = await (await fetch(API + '/api/login-records', { headers })).json();
    renderHistory(records);
    renderMap(records);
    loadPlans();
  } catch (err) { console.error(err); alert('Could not load dashboard'); }
}

let deviceChart = null;
function renderDeviceChart(labels, data) {
  const ctx = document.getElementById('deviceChart').getContext('2d');
  if (deviceChart) deviceChart.destroy();
  deviceChart = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: ['#0b63ff','#34c38f','#f46a6a','#ffc107'] }] } });
}

function renderHistory(records) {
  const tbody = document.querySelector('#historyTable tbody'); tbody.innerHTML = '';
  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.device||''}</td><td>${r.location||''}</td><td>${r.ip_address||''}</td><td>${r.status||''}</td>`;
    tbody.appendChild(tr);
  });
}

let map = null;
function renderMap(records) {
  const coords = records.map(r => parseLocation(r.location)).filter(Boolean);
  if (!map) { map = L.map('map').setView([20,0], 2); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map); }
  // clear markers
  if (map._layers) {
    Object.keys(map._layers).forEach(k => { const lay = map._layers[k]; if (lay && lay._icon) map.removeLayer(lay); });
  }
  coords.forEach(c => { L.marker([c.lat, c.lon]).addTo(map).bindPopup(c.label); });
}
function parseLocation(loc) {
  if (!loc) return null;
  const m = loc.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), label: loc };
  return null;
}

async function loadPlans() {
  const headers = { 'Authorization': 'Bearer ' + token };
  const plans = await (await fetch(API + '/api/monthly-plans', { headers })).json();
  const container = document.getElementById('plans'); container.innerHTML = '';
  plans.forEach(p => {
    const div = document.createElement('div'); div.className = 'plan';
    div.innerHTML = `<strong>${p.month}</strong><div>Goals: ${p.goals||''}</div><div>Progress: ${p.progress||0}%</div><div>Logins this month: ${p.login_count||0}</div>`;
    container.appendChild(div);
  });
}

document.getElementById('newPlan').addEventListener('click', async () => {
  const month = new Date().toISOString().slice(0,7);
  const goals = prompt('Enter goals for ' + month, '');
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  await fetch(API + '/api/monthly-plans', { method: 'POST', headers, body: JSON.stringify({ month, goals, tasks: [], progress: 0 }) });
  loadPlans();
});

// Auto-record a login event when user authenticates (simulate device info)
async function recordLogin(status='success') {
  if (!token) return;
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const device = navigator.userAgent || 'browser';
  const location = null; // optionally use geolocation
  await fetch(API + '/api/record-login', { method: 'POST', headers, body: JSON.stringify({ device, location, status }) });
}

// if token present on load
if (token) { setAuth(token); recordLogin('success'); }