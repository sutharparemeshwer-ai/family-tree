import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './MembersSidebar.css';

const MembersSidebar = ({ onMemberSelect, selectedMemberId, onMembersLoad }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false); // State for mobile collapse

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

  const handleMemberClick = (id) => {
    onMemberSelect(id);
    setIsMobileOpen(false); // Close sidebar on mobile after selection
  };

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  return (
    <>
      <button 
        className="sidebar-toggle-btn" 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Sidebar"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>
      <aside className={`members-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
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
                    onClick={() => handleMemberClick(member.id)}
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
      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)}></div>}
    </>
  );
};

export default MembersSidebar;