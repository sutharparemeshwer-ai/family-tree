import React, { useState } from 'react';
import './ShareModal.css';
import api from '../utils/api';

const ShareModal = ({ isOpen, onClose }) => {
  const [allowEdit, setAllowEdit] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/share/generate', {
        permission: allowEdit ? 'edit' : 'view'
      });
      const token = response.data.token;
      // Construct full URL
      const link = `${window.location.origin}/view/${token}`;
      setGeneratedLink(link);
    } catch (err) {
      console.error(err);
      setError('Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Share Your Family Tree</h2>
        
        <div className="share-options">
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={allowEdit}
              onChange={(e) => setAllowEdit(e.target.checked)}
            />
            <span className="toggle-text">Allow editing by anyone with the link</span>
          </label>
        </div>

        {!generatedLink && (
          <button 
            className="generate-btn" 
            onClick={handleGenerate} 
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Get Shareable Link'}
          </button>
        )}

        {error && <p className="error-text">{error}</p>}

        {generatedLink && (
          <div className="link-result">
            <input type="text" value={generatedLink} readOnly />
            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        
        <p className="modal-hint">
          {allowEdit 
            ? "⚠️ Warning: Anyone with this link can add or modify members in your tree."
            : "Anyone with this link can view your tree but cannot make changes."}
        </p>
      </div>
    </div>
  );
};

export default ShareModal;
