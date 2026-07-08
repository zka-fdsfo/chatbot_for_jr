import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

// This app is the staff portal only (Executive + Admin) — the Chat
// Widget lives in a separate bundle (widget.html) and is never mounted
// here. There is nothing for an unauthenticated visitor to do at "/"
// except sign in.
function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Navigate to={ROUTES.LOGIN} replace />;
}

export default HomePage;
