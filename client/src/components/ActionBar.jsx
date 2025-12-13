import React from 'react';
import './ActionBar.css';

const ActionBar = ({ onDownload, onShare, onGenerateBook }) => {
  return (
    <div className="action-bar">
      <button className="action-btn download-btn" onClick={onDownload}>
        <span className="icon">📷</span> Download Tree
      </button>
      <button className="action-btn share-btn" onClick={onShare}>
        <span className="icon">🔗</span> Share Tree
      </button>
      <button className="action-btn book-btn" onClick={onGenerateBook}>
        <span className="icon">📘</span> Family Book
      </button>
    </div>
  );
};

export default ActionBar;
