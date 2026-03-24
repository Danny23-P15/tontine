import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import de Link
import { Lock, Phone, LogIn } from "lucide-react"; // Pour rester dans le style pro
import "../css/LoginPage.css";
import logo from '../assets/logovalideo.png';

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault(); // Pour gérer le submit du formulaire
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Identifiants invalides");
      }

      localStorage.setItem("access_token", data.access);
      navigate("/groups");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <div className="login-header">
          <img src={logo} alt="Logo Valideo" className="login-logo-img" />
          <h2 className="login-title">Content de vous revoir</h2>
          <p className="login-subtitle">Connectez-vous à votre espace sécurisé</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="login-error-message">{error}</div>}

          <div className="input-group">
            <Phone size={18} className="input-icon" />
            <input
              className="login-input"
              placeholder="Numéro de téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              className="login-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? "Connexion..." : <><LogIn size={18} /> Se connecter</>}
          </button>
        </form>

        <div className="login-footer">
          <span>Pas encore de compte ?</span>
          <Link to="/register" className="register-link">S'inscrire</Link>
        </div>
      </div>
    </div>
  );
}