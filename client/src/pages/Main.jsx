import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EventsWidget from '../components/EventsWidget';
import './Main.css';

const MemoriesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);


const Main = () => {
  const navigate = useNavigate();

  const handleNavigateToTree = () => {
    navigate('/tree');
  };

  const handleNavigateToMemories = () => {
    navigate('/memories');
  };

  return (
    <div className="main-page-container">
      <Navbar />
      <section className="hero-section">
        <div className="particles">
          {[...Array(20)].map((_, i) => <span key={i} />)}
        </div>
        <div className="hero-content-wrapper">
          <h1 className="hero-title">Welcome to the Family Tree</h1>
          <p className="hero-subtitle">Draw your family in a creative way</p>
          <div className="hero-cta-container">
            <button className="hero-cta-btn" onClick={handleNavigateToTree}>
              <i className="fa-solid fa-tree"></i>
              Make Your Tree Now
            </button>
            <button className="hero-cta-btn memories-btn" onClick={handleNavigateToMemories}>
              <MemoriesIcon />
              Make Memories
            </button>
          </div>
          
          <EventsWidget />
        </div>
      </section>
    </div>
  );
};

export default Main;
