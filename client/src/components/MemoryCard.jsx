import React, { useRef } from 'react';
import './MemoryCard.css';

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const MemoryCard = ({ memory, onDelete }) => {
  const serverUrl = 'http://localhost:5000';
  const firstFile = memory.files && memory.files[0];
  const videoRef = useRef(null); // Create a ref for the video element

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card click if any
    if (window.confirm('Are you sure you want to delete this memory?')) {
      onDelete(memory.id);
    }
  };

  const handleVideoMouseEnter = () => {
    if (videoRef.current && videoRef.current.paused) { // Only play if currently paused
      videoRef.current.play().catch(error => {
        // Catch and ignore the "play() request was interrupted" error
        // This error is common with rapid play/pause and doesn't affect functionality
        if (error.name !== "AbortError") {
          console.error("Error attempting to play video:", error);
        }
      });
    }
  };

  const handleVideoMouseLeave = () => {
    if (videoRef.current && !videoRef.current.paused) { // Only pause if currently playing
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset video to start
    }
  };

  return (
    <div className="memory-card">
      <div className="memory-card-media-wrapper">
        {firstFile ? (
          <div
            className="memory-card-media"
            onMouseEnter={firstFile.type === 'video' ? handleVideoMouseEnter : undefined}
            onMouseLeave={firstFile.type === 'video' ? handleVideoMouseLeave : undefined}
          >
            {firstFile.type === 'image' ? (
              <img src={`${serverUrl}${firstFile.url}`} alt={memory.title} />
            ) : (
              <video ref={videoRef} muted loop playsInline> {/* Add ref, muted, loop, playsInline */}
                <source src={`${serverUrl}${firstFile.url}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
            {firstFile.type === 'video' && <div className="video-overlay"><PlayIcon /></div>}
            <div className="media-overlay">
              <h4 className="overlay-title">{memory.title}</h4>
            </div>
          </div>
        ) : (
          <div className="memory-card-media no-media-placeholder">
            <ImageIcon />
            <span>No Media</span>
          </div>
        )}
        <button className="delete-memory-btn" onClick={handleDeleteClick}>
          <TrashIcon />
        </button>
      </div>
      <div className="memory-card-content">
        <p className="memory-card-description">{memory.description}</p>
        <p className="memory-card-date">
          <CalendarIcon />
          {new Date(memory.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default MemoryCard;
