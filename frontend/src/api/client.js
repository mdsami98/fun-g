const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1001';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.isRestricted = Boolean(data?.isRestricted);
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
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      response.status,
      data,
    );
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
  getAgencyWalletNumbers: (token, agencyId) =>
    request(`/agencies/${agencyId}/wallet-numbers`, { token }),
  createAgencyWalletNumber: (token, agencyId, payload) =>
    request(`/agencies/${agencyId}/wallet-numbers`, { method: 'POST', body: payload, token }),
  updateAgencyWalletNumber: (token, agencyId, id, payload) =>
    request(`/agencies/${agencyId}/wallet-numbers/${id}`, { method: 'PUT', body: payload, token }),
  deleteAgencyWalletNumber: (token, agencyId, id) =>
    request(`/agencies/${agencyId}/wallet-numbers/${id}`, { method: 'DELETE', token }),
  syncAgencyWalletNumbers: (token, agencyId, walletNumbers) =>
    request(`/agencies/${agencyId}/wallet-numbers`, { method: 'PUT', body: { walletNumbers }, token }),
  getDepositMethods: (token) =>
    request('/wallet/deposit-methods', { token }),
  submitDeposit: (token, payload) =>
    request('/wallet/deposit', { method: 'POST', body: payload, token }),
  getMyWalletRequests: (token) =>
    request('/wallet/my-requests', { token }),
  getAgencyDepositRequests: (token, agencyId, params = {}) =>
    request(`/agencies/${agencyId}/deposit-requests?${new URLSearchParams(params)}`, { token }),
  getAgencyDepositStats: (token, agencyId) =>
    request(`/agencies/${agencyId}/deposit-stats`, { token }),
  approveAgencyDepositRequest: (token, agencyId, requestId) =>
    request(`/agencies/${agencyId}/deposit-requests/${requestId}/approve`, { method: 'PATCH', token }),
  rejectAgencyDepositRequest: (token, agencyId, requestId) =>
    request(`/agencies/${agencyId}/deposit-requests/${requestId}/reject`, { method: 'PATCH', token }),
  getUserWithdrawalAccounts: (token) =>
    request('/wallet/withdrawal-accounts', { token }),
  setupWithdrawalAccount: (token, payload) =>
    request('/wallet/withdrawal-account', { method: 'POST', body: payload, token }),
  getAgencyUsers: (token, agencyId) =>
    request(`/agencies/${agencyId}/users`, { token }),
  getUserRestrictions: (token, agencyId, userId) =>
    request(`/agencies/${agencyId}/users/${userId}/restrictions`, { token }),
  addUserRestriction: (token, agencyId, userId, message) =>
    request(`/agencies/${agencyId}/users/${userId}/restrictions`, {
      method: 'POST',
      body: { message },
      token,
    }),
  updateUserRestriction: (token, agencyId, userId, restrictionId, message) =>
    request(`/agencies/${agencyId}/users/${userId}/restrictions/${restrictionId}`, {
      method: 'PATCH',
      body: { message },
      token,
    }),
  deleteUserRestriction: (token, agencyId, userId, restrictionId) =>
    request(`/agencies/${agencyId}/users/${userId}/restrictions/${restrictionId}`, {
      method: 'DELETE',
      token,
    }),
  getMyRestriction: (token) =>
    request('/wallet/restriction', { token }),
  submitWithdrawal: (token, payload) =>
    request('/wallet/withdraw', { method: 'POST', body: payload, token }),
  addUserBalance: (token, agencyId, userId, amount) =>
    request(`/agencies/${agencyId}/users/${userId}/balance`, {
      method: 'POST',
      body: { amount },
      token,
    }),
};



