/* Client-side checks for the user auth forms. They MIRROR the backend DTOs
   (backend/src/auth/dto/*.dto.ts) so a field that passes here is not
   rejected by the server for format. Messages state cause + fix. */

export const PHONE_PATTERN = /^\+?[0-9]{10,15}$/; // RegisterDto.phone
export const PASSWORD_MIN = 8; // RegisterDto.password

export function validateLogin({ phone, password }) {
  const errors = {};
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegister({ name, phone, agencyCode, referralCode, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your full name.';
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!PHONE_PATTERN.test(phone.trim()))
    errors.phone = 'Use 10–15 digits, optionally starting with +, e.g. +8801712345678.';
  if (!agencyCode?.trim() && !referralCode?.trim())
    errors.agencyCode = 'Enter an agency code or referral invitation code.';
  if (password.length < PASSWORD_MIN)
    errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  if (!confirmPassword) errors.confirmPassword = 'Re-enter your password.';
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
  return errors;
}

/** Field order matters: the first invalid one receives focus on submit. */
export function firstInvalid(errors, order) {
  return order.find((field) => errors[field]);
}
