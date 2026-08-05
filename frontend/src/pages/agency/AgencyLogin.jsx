import { LoginForm } from '../../components/LoginForm';

export function AgencyLogin() {
  return (
    <LoginForm
      logo="🏢 AGENCY ADMIN"
      title="Agency Management"
      allowedRoles={['agency_admin']}
      homePath="/agency"
    />
  );
}
