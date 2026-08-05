import { LoginForm } from '../../components/LoginForm';

export function AdminLogin() {
  return (
    <LoginForm
      logo="🛡️ SUPER ADMIN"
      title="Platform Administration"
      allowedRoles={['super_admin']}
      homePath="/admin"
    />
  );
}
