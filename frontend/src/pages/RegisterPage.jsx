import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Phone, Mail, UserPlus, ArrowLeft } from "lucide-react";
import logo from '../assets/logovalideo.png';
import "../css/LoginPage.css"; // On réutilise le même CSS de base pour la cohérence

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      // Optionnel : redirection vers login ou auto-login
      alert("Compte créé avec succès !");
      navigate("/login");
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
          <h2 className="login-title">Créer un compte</h2>
          <p className="login-subtitle">Rejoignez Valideo dès aujourd'hui</p>
        </div>

        <form onSubmit={handleRegister} className="login-form">
          {error && <div className="login-error-message">{error}</div>}

          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              name="full_name"
              className="login-input"
              placeholder="Nom complet"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Phone size={18} className="input-icon" />
            <input
              name="phone_number"
              className="login-input"
              placeholder="Numéro de téléphone"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              name="email"
              type="email"
              className="login-input"
              placeholder="Adresse e-mail"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <UserPlus size={18} className="input-icon" style={{ opacity: 0.5 }} />
            <input
              name="password"
              type="password"
              className="login-input"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? "Création..." : <><UserPlus size={18} /> S'inscrire</>}
          </button>
        </form>

        <div className="login-footer">
          <span>Déjà inscrit ?</span>
          <Link to="/login" className="register-link">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}