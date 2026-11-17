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
  toggleAgencyStatus: (token, agencyId, isActive) =>
    request(`/agencies/${agencyId}/status`, {
      method: 'PATCH',
      body: { isActive },
      token,
    }),
  getSuperAdminMoneyFlow: (token, params = {}) =>
    request(`/agencies/analytics/money-flow?${new URLSearchParams(params)}`, { token }),
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
  getMyReferrals: (token) =>
    request('/referrals/me', { token }),
  regenerateReferralCode: (token) =>
    request('/referrals/regenerate', { method: 'POST', token }),
  validateReferralCode: (code) =>
    request(`/referrals/validate/${code}`),
  getAgencyUserReferralConfig: (token, agencyId, userId) =>
    request(`/agencies/${agencyId}/referrals/users/${userId}`, { token }),
  updateAgencyUserReferralConfig: (token, agencyId, userId, payload) =>
    request(`/agencies/${agencyId}/referrals/users/${userId}`, {
      method: 'PUT',
      body: payload,
      token,
    }),
  getAgencyReferralHistory: (token, agencyId, params = {}) =>
    request(`/agencies/${agencyId}/referrals/history?${new URLSearchParams(params)}`, { token }),
  getAgencyDefaultReferralConfig: (token, agencyId) =>
    request(`/agencies/${agencyId}/referrals/default-config`, { token }),
  updateAgencyDefaultReferralConfig: (token, agencyId, payload) =>
    request(`/agencies/${agencyId}/referrals/default-config`, {
      method: 'PUT',
      body: payload,
      token,
    }),
  getMyNotifications: (token, limit = 30) =>
    request(`/notifications/me?limit=${limit}`, { token }),
  markNotificationRead: (token, id) =>
    request(`/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllNotificationsRead: (token) =>
    request('/notifications/mark-all-read', { method: 'POST', token }),
  getDailySpinStatus: (token) =>
    request('/daily-spin/status', { token }),
  executeDailySpin: (token) =>
    request('/daily-spin/spin', { method: 'POST', token }),
  getVipStatus: (token) =>
    request('/vip/me', { token }),
  claimVipReward: (token, level) =>
    request(`/vip/claim/${level}`, { method: 'POST', token }),
  getMyChatThread: (token) =>
    request('/chat/my-thread', { token }),
  getChatMessages: (token, threadId, limit = 50, offset = 0) =>
    request(`/chat/threads/${threadId}/messages?limit=${limit}&offset=${offset}`, { token }),
  sendChatMessage: (token, threadId, text) =>
    request(`/chat/threads/${threadId}/messages`, {
      method: 'POST',
      body: { text },
      token,
    }),
  markChatThreadRead: (token, threadId) =>
    request(`/chat/threads/${threadId}/read`, { method: 'PATCH', token }),
  getAgencyChatThreads: (token) =>
    request('/chat/agency/threads', { token }),
  redeemPromoCode: (token, code) =>
    request('/promo-codes/redeem', {
      method: 'POST',
      body: { code },
      token,
    }),
  getAgencyPromoCodes: (token) =>
    request('/promo-codes/agency', { token }),
  createAgencyPromoCode: (token, payload) =>
    request('/promo-codes/agency', {
      method: 'POST',
      body: payload,
      token,
    }),
  toggleAgencyPromoCode: (token, id, isActive) =>
    request(`/promo-codes/agency/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
      token,
    }),
  deleteAgencyPromoCode: (token, id) =>
    request(`/promo-codes/agency/${id}`, {
      method: 'DELETE',
      token,
    }),
};






