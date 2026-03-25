import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { Hourglass, Bell, Inbox, CircleCheck, X } from "lucide-react";
import { useAuth } from '../auth/AuthContext';
import { getPendingNotifications } from "../services/notifications";
import '../css/layout.css';

function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");


  // Charger les notifications
  const fetchNotifs = async () => {
    try {
      const data = await getPendingNotifications();
      setNotifications(data.results || []);
    } catch (e) {
      console.error("Erreur notifications:", e);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Recherche pour:", searchTerm);
    // navigate(`/search?q=${searchTerm}`); 
  };

  useEffect(() => {
    if (user) fetchNotifs();
    
    // Fermer le menu si on clique ailleurs
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  const toggleDropdown = () => {
    if (!showDropdown) fetchNotifs(); // Rafraîchir à l'ouverture
    setShowDropdown(!showDropdown);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        
        <div className="header-left">
          <form className="header-search-form" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="header-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <X 
                size={14} 
                className="clear-search" 
                onClick={() => setSearchTerm("")} 
              />
            )}
          </form>
        </div>

        <nav className="header-nav">
          {/* Icône Sablier / En attente */}
          <NavLink 
            to="/notifications" 
            className="header-nav-link" 
            title="En attente"
            onClick={() => setShowDropdown(false)}
          >
            <Hourglass size={20} /> 
          </NavLink>
          
          <div className="notif-wrapper" ref={dropdownRef}>
            <button 
              className={`header-nav-link btn-notif ${showDropdown ? 'active' : ''}`} 
              onClick={toggleDropdown}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="notif-badge">{notifications.length}</span>
              )}
            </button>

            {showDropdown && (
              <div className="notif-dropdown">
                <div className="dropdown-header">
                  <span>Notifications</span>
                  <span className="count">{notifications.length} en attente</span>
                </div>

                <div className="dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="empty-notif">Aucune nouvelle notification</div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className="dropdown-item" 
                        onClick={() => {
                          navigate('/notifications/inbox');
                          setShowDropdown(false);
                        }}
                      >
                        <div className="item-icon"><Inbox size={16} /></div>
                        <div className="item-content">
                          <p className="item-text">{n.message || "Nouvelle invitation"}</p>
                          <small className="item-time">Il y a un instant</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="dropdown-footer" onClick={() => { 
                  navigate('/notifications/inbox'); 
                  setShowDropdown(false); 
                }}>
                  Voir toutes les notifications
                </div>
              </div>
            )}
          </div>

          {/* Profil utilisateur */}
          {user && (
            <div className="user-profile-pill">
              <span className="user-id">ID: {user.id}</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;