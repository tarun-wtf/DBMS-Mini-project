class PageApiClient {
  async request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = localStorage.getItem('freshkartToken');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
}

const pageApi = new PageApiClient();
const pageMoney = (value) => `₹${Number(value).toFixed(2)}`;
const pageToken = () => localStorage.getItem('freshkartToken');
const requireLogin = () => { if (!pageToken()) { window.location.href = 'auth.html'; return false; } return true; };