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
      <img 
        src={member.profile_img_url ? `${serverUrl}${member.profile_img_url}` : 'https://via.placeholder.com/120'} 
        alt={`${member.first_name} ${member.last_name}`}
        className="member-card-img"
      />
      <h2 className="member-card-name">{member.first_name} {member.last_name}</h2>
      {member.nickname && <p className="member-card-nickname">({member.nickname})</p>}
    </div>
  );
};

export default MemberCard;
