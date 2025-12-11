import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './MembersSidebar.css';

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const MembersSidebar = ({ onMemberSelect, selectedMemberId, onMembersLoad, isCollapsed, onToggle }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get('/members');
        setMembers(res.data);
        onMembersLoad(res.data);
      } catch (err) {
        setError('Failed to load family members.');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [onMembersLoad]);

  const filteredMembers = members.filter(member =>
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const serverUrl = 'http://localhost:5000';

  return (
    <aside className={`members-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle-btn" onClick={onToggle}>
        <ChevronLeft />
      </button>
      <div className="sidebar-header">
        <h2>Family Members</h2>
        <input
          type="text"
          placeholder="Find a member..."
          className="sidebar-search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="members-list-container">
        {loading && <p className="sidebar-message">Loading...</p>}
        {error && <p className="sidebar-message error">{error}</p>}
        {!loading && !error && (
          <ul className="members-list">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <li
                  key={member.id}
                  className={`member-item ${member.id === selectedMemberId ? 'active' : ''}`}
                  onClick={() => onMemberSelect(member.id)}
                  title={`${member.first_name} ${member.last_name}`}
                >
                  <img
                    src={member.profile_img_url ? `${serverUrl}${member.profile_img_url}` : `https://ui-avatars.com/api/?name=${member.first_name}+${member.last_name}&background=random`}
                    alt={`${member.first_name}`}
                    className="member-avatar"
                  />
                  <span className="member-name">{member.first_name} {member.last_name}</span>
                </li>
              ))
            ) : (
              <p className="sidebar-message">No members found.</p>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default MembersSidebar;