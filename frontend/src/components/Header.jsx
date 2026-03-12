import React from 'react';
import { NavLink } from "react-router-dom";
import { Hourglass, Bell } from "lucide-react";
import '../css/layout.css';
import logo from '../assets/logovalideo.png';


function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <nav className="header-nav">
          <NavLink to="/notifications" className="header-nav-link">
            <Hourglass size={18} className="icon" /> 
            <span className="link-text"></span>
          </NavLink>
          <NavLink to="/notifications/inbox" className="header-nav-link">
            <Bell size={18} className="icon" /> 
            <span className="link-text"></span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;