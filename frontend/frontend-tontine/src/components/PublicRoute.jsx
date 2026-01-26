import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../auth";

function PublicRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/notifications" replace />;
  }
  return children;
}

export default PublicRoute;
