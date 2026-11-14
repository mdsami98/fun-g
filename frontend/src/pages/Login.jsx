import { LoginForm } from '../components/LoginForm';

export function Login() {
  return (
    <LoginForm
      logo="AVIATOR"
      title="Premium Gaming Platform"
      allowedRoles={['user']}
      homePath="/"
      registerLink="/register"
      variant="light"
    />
  );
}
