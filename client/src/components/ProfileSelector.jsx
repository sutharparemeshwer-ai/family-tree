import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from './Modal';
import './ProfileSelector.css';

const ProfileSelector = ({ isOpen, onClose, onProfileSelected }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // New search state

  const fetchFamilyMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/members');
      setFamilyMembers(response.data);
    } catch (err) {
      console.error('Error fetching family members for selector:', err);
      setError('Failed to load family members. Please add yourself first.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFamilyMembers();
    }
  }, [isOpen, fetchFamilyMembers]);

  const handleSelectProfile = (member) => {
    localStorage.setItem('activeProfile', JSON.stringify({
      id: member.id,
      name: `${member.first_name} ${member.last_name || ''}`,
    }));
    onProfileSelected(); // Notify parent component
    onClose(); // Close the modal
  };

  // Filter members based on search
  const filteredMembers = familyMembers.filter(member => 
    `${member.first_name} ${member.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  return (
    <Modal isOpen={isOpen} onClose={onClose} disableClose={true}>
      <div className="profile-selector">
        <div className="selector-header">
          <h2 className="selector-title">Who are you?</h2>
          <p className="selector-subtitle">Select your profile to continue</p>
        </div>

        <div className="profile-search-container">
          <input 
            type="text" 
            placeholder="Search your name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="profile-search-input"
          />
        </div>

        {loading && <p>Loading profiles...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="profile-scroll-container">
          <div className="profile-list">
            {filteredMembers.length === 0 && !loading && !error && (
              <p className="no-members-message">
                {searchTerm ? 'No matching profiles found.' : 'No family members found. Please add yourself to the tree.'}
              </p>
            )}
            {filteredMembers.map(member => (
              <div 
                key={member.id} 
                className="profile-item"
                onClick={() => handleSelectProfile(member)}
              >
                <img 
                  src={member.profile_img_url ? `${serverUrl}${member.profile_img_url}` : 'https://via.placeholder.com/100'} 
                  alt={member.first_name} 
                  className="profile-avatar" 
                />
                <span className="profile-name">{member.first_name} {member.last_name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <p className="selector-hint">This helps us personalize your experience.</p>
      </div>
    </Modal>
  );
};

export default ProfileSelector;
