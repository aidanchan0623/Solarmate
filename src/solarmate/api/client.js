export const API_BASE_URL = import.meta.env.VITE_SOLARMATE_API_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY = 'solarmate_access_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(', ') : detail || 'Request failed');
  }

  return data;
}

export async function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  setStoredToken(data.access_token);
  return data;
}

export async function getCurrentUser() {
  return request('/api/auth/me');
}

export async function selectProsumerPlan(payload) {
  return request('/api/prosumer/select-plan', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function selectConsumerPackage(payload) {
  return request('/api/consumer/select-package', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getProsumerProfile() {
  return request('/api/prosumer/profile');
}

export async function getProsumerOverview() {
  return request('/api/prosumer/overview');
}

export async function getProsumerDailyExport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/prosumer/daily-export${query ? `?${query}` : ''}`);
}

export async function getProsumerMonthlyExportHistory() {
  return request('/api/prosumer/monthly-export-history');
}

export async function getProsumerWallet() {
  return request('/api/prosumer/wallet');
}

export async function getProsumerStatement(month) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';
  return request(`/api/prosumer/statement${query}`);
}

export async function getProsumerEspLive() {
  return request('/api/prosumer/esp-live');
}

export async function postMeterReading(payload) {
  return request('/api/meter/reading', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function simulateMeterReading(payload = {}) {
  return request('/api/meter/simulate-reading', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getLatestMeterReading(deviceId) {
  return request(`/api/meter/latest/${encodeURIComponent(deviceId)}`);
}

export async function getTodayMeterReadings(deviceId) {
  return request(`/api/meter/today/${encodeURIComponent(deviceId)}`);
}

export async function getMeterLcdSummary(deviceId) {
  return request(`/api/meter/lcd-summary/${encodeURIComponent(deviceId)}`);
}

export async function getConsumerProfile() {
  return request('/api/consumer/profile');
}

export async function getConsumerOverview() {
  return request('/api/consumer/overview');
}

export async function getConsumerLiveMeter() {
  return request('/api/consumer/live-meter');
}

export async function getConsumerMonthlyUsageHistory() {
  return request('/api/consumer/monthly-usage-history');
}

export async function getConsumerBilling() {
  return request('/api/consumer/billing');
}

export async function payConsumerBill() {
  return request('/api/consumer/pay-bill', { method: 'POST' });
}

export async function getConsumerWallet() {
  return request('/api/consumer/wallet');
}

export async function getConsumerStatement(month) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';
  return request(`/api/consumer/statement${query}`);
}

export async function getAdminUsers() {
  return request('/api/admin/users');
}

export async function getAdminOverview(options = {}) {
  return request('/api/admin/overview', options);
}

export async function getAdminMonthlyExportRecords() {
  return request('/api/admin/monthly-export-records');
}

export async function getAdminGridIntelligence() {
  return request('/api/admin/grid-intelligence');
}

export async function getWallet() {
  return request('/api/wallet');
}

export async function getWalletTransactions() {
  return request('/api/wallet/transactions');
}

export async function topupWallet(amount) {
  return request('/api/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
}

export async function cashoutWallet(amount) {
  return request('/api/wallet/cashout', {
    method: 'POST',
    body: JSON.stringify(amount ? { amount } : {})
  });
}

export async function getAdminWalletTransactions() {
  return request('/api/wallet/admin/transactions');
}

export async function deleteAdminUser(userId) {
  return request(`/api/admin/users/${userId}`, { method: 'DELETE' });
}

export async function disableAdminUser(userId) {
  return request(`/api/admin/users/${userId}/disable`, { method: 'PATCH' });
}

export async function enableAdminUser(userId) {
  return request(`/api/admin/users/${userId}/enable`, { method: 'PATCH' });
}
