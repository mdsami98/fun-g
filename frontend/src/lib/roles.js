export const ROLE_HOME_PATH = {
  super_admin: '/admin',
  agency_admin: '/agency',
  user: '/',
};

export const ROLE_LOGIN_PATH = {
  super_admin: '/admin/login',
  agency_admin: '/agency/login',
  user: '/login',
};

export function roleHomePath(role) {
  return ROLE_HOME_PATH[role] ?? '/login';
}

export function loginPathForPrefix(pathname) {
  if (pathname.startsWith('/admin')) return '/admin/login';
  if (pathname.startsWith('/agency')) return '/agency/login';
  return '/login';
}
