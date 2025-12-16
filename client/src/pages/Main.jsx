import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import EventsWidget from '../components/EventsWidget';
import ProfileSelector from '../components/ProfileSelector';
import NewsFeed from '../components/NewsFeed';
import LoadingScreen from '../components/LoadingScreen'; // Import the loader
import InstallButton from '../components/InstallButton'; // Import Install Button
import './Main.css';

// Reusing existing icons or replacing with better ones if necessary
const TreeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path>
    <path d="M12 4v16"></path>
    <path d="M4 18h16"></path>
    <path d="M8 12h8"></path>
    <path d="M12 8h0"></path>
  </svg>
);

const MemoriesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const Main = ({ user }) => {
  const navigate = useNavigate();
  const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [showSplash, setShowSplash] = useState(true); // State for splash screen

  // Handle Loading Screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show for 2.5 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkProfileAndMembers = async () => {
      const storedProfile = localStorage.getItem('activeProfile');
      if (storedProfile) {
        setActiveProfile(JSON.parse(storedProfile));
      } else {
        try {
          const response = await api.get('/members');
          if (response.data && response.data.length > 0) {
            setIsProfileSelectorOpen(true);
          }
        } catch (error) {
          console.error('Error checking members:', error);
        }
      }
    };

    checkProfileAndMembers();
  }, []);

  const handleProfileSelected = () => {
    setActiveProfile(JSON.parse(localStorage.getItem('activeProfile')));
    setIsProfileSelectorOpen(false);
  };

  const handleNavigateToTree = () => {
    navigate('/tree');
  };

  const handleNavigateToMemories = () => {
    navigate('/memories');
  };

  if (showSplash) {
    return <LoadingScreen />;
  }

  return (
    <div className="main-page-container">
      <Navbar />
      <section className="hero-section">
        <div className="particles">
          {[...Array(20)].map((_, i) => <span key={i} />)}
        </div>
        <div className="hero-content-wrapper">
          <h1 className="hero-title">Connect. Preserve. Explore.</h1>
          <p className="hero-subtitle">
            Your family's legacy, beautifully mapped and cherished.
          </p>
          <div className="hero-cta-container">
            <button className="hero-cta-btn" onClick={handleNavigateToTree}>
              <TreeIcon />
              Build Your Tree
            </button>
            <button className="hero-cta-btn memories-btn" onClick={handleNavigateToMemories}>
              <MemoriesIcon />
              Capture Memories
            </button>
            <InstallButton />
          </div>
          
          <div className="main-widgets-container">
            <EventsWidget />
            {activeProfile && <NewsFeed />}
          </div>
        </div>
      </section>

      <ProfileSelector
        isOpen={isProfileSelectorOpen}
        onClose={() => setIsProfileSelectorOpen(false)}
        onProfileSelected={handleProfileSelected}
      />
      
      <footer className="main-footer">
        <p>&copy; {new Date().getFullYear()} Family Tree App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Main;