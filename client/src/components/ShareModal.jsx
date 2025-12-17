import React, { useState, useEffect } from 'react';
import './ShareModal.css';
import api from '../utils/api';

const ShareModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
  
  // Create State
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Manage State
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const fetchLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await api.get('/share/links');
      setLinks(res.data);
    } catch (err) {
      console.error('Failed to fetch links');
    } finally {
      setLoadingLinks(false);
    }
  };

  // Fetch links when switching to manage tab
  useEffect(() => {
    if (activeTab === 'manage' && isOpen) {
      fetchLinks();
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/share/generate', {
        permission,
        label: label || 'Untitled Link',
        guest_email: email // Send as guest_email
      });
      
      // Safety check for both new and old response formats
      const linkData = response.data.link || response.data;
      if (!linkData || !linkData.token) {
        throw new Error('Invalid server response');
      }

      const token = linkData.token;
      const link = `${window.location.origin}/view/${token}`;
      setGeneratedLink(link);
      
      // Clear form
      setLabel('');
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('Failed to generate link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/share/links/${id}`);
      setLinks(links.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to revoke link');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Share Your Family Tree</h2>
        
        <div className="share-tabs">
          <button 
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Invite
          </button>
          <button 
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Manage Links
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'create' && (
            <div className="create-view">
              <div className="input-group">
                <label>Invite Label (e.g. "For Uncle Bob")</label>
                <input 
                  type="text" 
                  value={label} 
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Who is this link for?"
                />
              </div>

              <div className="input-group">
                <label>Guest Email (Optional)</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                />
              </div>

              <div className="input-group">
                <label>Permissions</label>
                <div className="permission-options">
                  <label className={`perm-radio ${permission === 'view' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      checked={permission === 'view'} 
                      onChange={() => setPermission('view')}
                    />
                    View Only
                  </label>
                  <label className={`perm-radio ${permission === 'edit' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      checked={permission === 'edit'} 
                      onChange={() => setPermission('edit')}
                    />
                    Can Edit
                  </label>
                </div>
              </div>

              {!generatedLink && (
                <button 
                  className="generate-btn" 
                  onClick={handleGenerate} 
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Create Link'}
                </button>
              )}

              {generatedLink && (
                <div className="link-result-container">
                  <p>Success! Send this link to {label || 'guest'}:</p>
                  <div className="link-result">
                    <input type="text" value={generatedLink} readOnly />
                    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => handleCopy(generatedLink)}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <button className="btn-reset" onClick={() => { setGeneratedLink(''); setCopied(false); }}>Create Another</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="manage-view">
              {loadingLinks ? (
                <p>Loading links...</p>
              ) : links.length === 0 ? (
                <p className="empty-state">No active links found.</p>
              ) : (
                <ul className="links-list">
                  {links.map(link => (
                    <li key={link.id} className="link-item">
                      <div className="link-info">
                        <span className="link-label">{link.label}</span>
                        <span className={`link-badge ${link.permission}`}>{link.permission}</span>
                      </div>
                      <div className="link-meta">
                        Created: {new Date(link.created_at).toLocaleDateString()}
                      </div>
                      <div className="link-actions">
                        <button className="btn-sm-copy" onClick={() => handleCopy(`${window.location.origin}/view/${link.token}`)}>Copy</button>
                        <button className="btn-sm-revoke" onClick={() => handleRevoke(link.id)}>Revoke</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;