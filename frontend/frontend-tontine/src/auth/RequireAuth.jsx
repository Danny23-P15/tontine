import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { phone } = useAuth();

  if (!phone) {
    return <Navigate to="/login" />;
  }

  return children;
}
