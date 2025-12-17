import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './NewsFeed.css';

const NewsFeed = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit');
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load recent activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString(); 
  };

  const getActionDescription = (log) => {
    const actor = log.actor_name || 'Someone';
    const target = log.target_name || 'an item';
    
    switch (log.action_type) {
      case 'ADD_MEMBER':
        return <span><strong>{actor}</strong> added <strong>{target}</strong> to the tree.</span>;
      case 'EDIT_MEMBER':
        return <span><strong>{actor}</strong> edited details for <strong>{target}</strong>.</span>;
      case 'DELETE_MEMBER':
        return <span><strong>{actor}</strong> removed <strong>{target}</strong> from the tree.</span>;
      default:
        return <span><strong>{actor}</strong> performed {log.action_type}.</span>;
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'ADD_MEMBER': return '✅';
      case 'EDIT_MEMBER': return '✏️';
      case 'DELETE_MEMBER': return '🗑️';
      default: return '📝';
    }
  };

  return (
    <div className="news-feed-container">
      <div className="feed-header">
        <h3 className="feed-title">Recent Activity</h3>
        <button className="refresh-btn" onClick={fetchLogs}>Refresh</button>
      </div>

      {loading && <div className="loading-feed">Loading updates...</div>}
      {error && <p className="error-message">{error}</p>}

      <div className="posts-list">
        {!loading && logs.length === 0 && (
          <div className="empty-state">
            <p>No recent activity recorded.</p>
            <span style={{ fontSize: '2rem', display: 'block', marginTop: '10px' }}>🍃</span>
          </div>
        )}
        
        {logs.map(log => (
          <div key={log.id} className="post-item activity-item">
            <div className="activity-icon">
              {getActionIcon(log.action_type)}
            </div>
            <div className="activity-content">
              <p className="post-content">{getActionDescription(log)}</p>
              <span className="post-time">
                {formatTimestamp(log.created_at)} 
                {log.actor_email && <span className="actor-email"> • {log.actor_email}</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;