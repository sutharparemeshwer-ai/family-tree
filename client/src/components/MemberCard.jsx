import React, { useState } from 'react';
import './MemberCard.css';

// Simple Plus Icon (re-used from Tree.jsx)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);


const MemberCard = ({ member, serverUrl, onAddRelative }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Create anonymous avatar SVG for users without profile pictures
  const createAnonymousAvatar = (name) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A', '#FFC107'];
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];

    return `data:image/svg+xml;base64,${btoa(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="60" fill="${bgColor}"/>
        <text x="60" y="75" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `)}`;
  };

  const hasProfileImage = !!member.profile_img_url;
  const imageSrc = hasProfileImage ? `${serverUrl}${member.profile_img_url}` : createAnonymousAvatar(`${member.first_name} ${member.last_name}`);

  // Anonymous avatars should be shown immediately since they're generated locally
  const shouldShowImageImmediately = !hasProfileImage;

  return (
    <div className="member-card">
      <button className="add-btn" onClick={() => setMenuVisible(!menuVisible)}>
        <PlusIcon />
      </button>
      {menuVisible && (
        <div className="add-menu">
          <button onClick={() => onAddRelative('Father', member.id)}>Add Father</button>
          <button onClick={() => onAddRelative('Mother', member.id)}>Add Mother</button>
          <button onClick={() => onAddRelative('Spouse', member.id)}>Add Spouse</button>
          <button onClick={() => onAddRelative('Child', member.id)}>Add Child</button>
        </div>
      )}
      <div className="image-container">
        <img
          src={imageSrc}
          alt={`${member.first_name} ${member.last_name}`}
          className={`member-card-img ${(imageLoaded || shouldShowImageImmediately) ? 'loaded' : ''} ${imageError ? 'error' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />
        {!imageLoaded && !shouldShowImageImmediately && (
          <div className="image-placeholder">
            <div className="image-loading-spinner"></div>
          </div>
        )}
      </div>
      <h2 className="member-card-name">{member.first_name} {member.last_name}</h2>
      {member.nickname && <p className="member-card-nickname">({member.nickname})</p>}
    </div>
  );
};

export default MemberCard;
