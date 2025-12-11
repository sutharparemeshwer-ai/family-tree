import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const serverUrl = 'http://localhost:5000';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <a href="/main" className="navbar-brand-link">FamilyTree</a>
      </div>
      {user && (
        <div className="navbar-user" onClick={() => setDropdownVisible(!dropdownVisible)}>
          <img 
            src={user.profile_img_url ? `${serverUrl}${user.profile_img_url}` : 'https://via.placeholder.com/40'} 
            alt="Profile" 
            className="user-profile-img" 
          />
          <div className="user-details">
            <span className="user-name">{user.first_name} {user.last_name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          {dropdownVisible && (
            <div className="user-dropdown">
              <div className="dropdown-user-info">
                <span className="user-name">{user.first_name} {user.last_name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <Link to="/settings" className="dropdown-item">Profile Settings</Link>
              <button onClick={handleLogout} className="dropdown-item">Logout</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
