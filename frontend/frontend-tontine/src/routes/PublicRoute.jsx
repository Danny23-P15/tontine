import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  // Si déjà connecté → redirection vers notifications
  if (isAuthenticated) {
    return <Navigate to="/notifications" replace />;
  }

  return children;
}

export default PublicRoute;
