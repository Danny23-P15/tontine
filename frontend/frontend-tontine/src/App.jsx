import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";  // Importez AuthProvider
import LoginPage from "./pages/LoginPage";
import NotificationsPage from "./pages/NotificationsPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import PrivateRoute from "./routes/PrivateRoute";
import PublicRoute from "./routes/PublicRoute";
import Layout from "./components/Layout";

function App() {
  return (
    <AuthProvider>  {/* Wrap avec AuthProvider */}
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          <Route
            path="/"
            element={
              <Navigate to="/notifications" replace />
            }
          />

          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Layout>
                  <NotificationsPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/groups/create"
            element={
              <PrivateRoute>
                <Layout>
                  <CreateGroupPage />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Route 404 si nécessaire */}
          <Route
            path="*"
            element={
              <div>
                <h1>404 - Page non trouvée</h1>
                <Navigate to="/" replace />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;