const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1001';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? 'Something went wrong';
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, response.status);
  }

  return data;
}

export const api = {
  login: (phone, password) => request('/auth/login', { method: 'POST', body: { phone, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  listAgencies: (token) => request('/agencies', { token }),
  createAgency: (token, payload) => request('/agencies', { method: 'POST', body: payload, token }),
  getRoundHistory: (params = {}) =>
    request(`/game/rounds?${new URLSearchParams(params)}`),
  getMyBetHistory: (token, params = {}) =>
    request(`/game/my-bets?${new URLSearchParams(params)}`, { token }),
};
