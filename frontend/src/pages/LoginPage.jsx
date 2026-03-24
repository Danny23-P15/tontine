import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/LoginPage.css";
import logo from '../assets/logovalideo.png'

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/auth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: phone,
        password: password,
      }),
    });

    if (!res.ok) {
      alert("Identifiants invalides");
      return;
    }

    const data = await res.json();
    localStorage.setItem("access_token", data.access);

    navigate("/groups");
  };

  return (
    <div className="login-container">
      <div className="logo">
      <img src={logo} alt="Logo" style={{width: "230px", height: "100px"}}/>
        <h2 className="login-title">Connexion</h2>
      </div>

      <input
        className="login-input"
        placeholder="Téléphone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        className="login-input"
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="login-button" onClick={handleLogin}>
        Se connecter
      </button>
    </div>
  );
}
