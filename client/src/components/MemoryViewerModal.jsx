import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from './Modal';
import './MemoryViewerModal.css';

const MemoryViewerModal = ({ isOpen, onClose, memory, serverUrl }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  const activeProfile = JSON.parse(localStorage.getItem('activeProfile'));

  const fetchComments = useCallback(async () => {
    if (!memory?.id) return;
    setLoadingComments(true);
    try {
      const res = await api.get(`/social/memories/${memory.id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [memory?.id]);

  useEffect(() => {
    if (isOpen && memory?.id) {
      fetchComments();
    }
  }, [isOpen, memory?.id, fetchComments]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!activeProfile) {
      alert('Please select your profile to comment.');
      return;
    }

    setPostingComment(true);
    try {
      await api.post(`/social/memories/${memory.id}/comments`, {
        content: newComment,
        authorMemberId: activeProfile.id,
      });
      setNewComment('');
      fetchComments(); // Refresh comments
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  if (!memory || !isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="memory-viewer-modal-content">
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        {/* Left: Media */}
        <div className="memory-details-section">
          <div className="memory-media-grid">
            {memory.files.map(file => {
              console.log("Memory file_type:", file.file_type); // DEBUG LOG
              return (
                <div key={file.id} className="memory-media-item">
                  {file.file_type && file.file_type.startsWith('image') ? (
                    <img src={`${serverUrl}${file.file_url}`} alt={memory.title} />
                  ) : file.file_type && file.file_type.startsWith('video') ? (
                    <video controls src={`${serverUrl}${file.file_url}`} />
                  ) : (
                    <p>Unsupported file type: {file.file_type}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="memory-info-overlay">
            <h3 className="memory-title">{memory.title}</h3>
            <p className="memory-description">{memory.description}</p>
          </div>
        </div>

        {/* Right: Comments */}
        <div className="comments-section">
          <div className="comments-header">
            <h4 className="comments-title">Comments</h4>
            <span className="comments-count">{comments.length}</span>
          </div>
          
          <div className="comments-list">
            {loadingComments && <p>Loading...</p>}
            {!loadingComments && comments.length === 0 && <p className="no-comments">Be the first to comment!</p>}
            
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.author_name}</span>
                  <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))}
          </div>

          <div className="comment-form-container">
            {activeProfile ? (
              <form className="comment-form" onSubmit={handlePostComment}>
                <textarea
                  placeholder={`Add a comment as ${activeProfile.name}...`}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={postingComment}
                ></textarea>
                <button type="submit" className="comment-submit-btn" disabled={postingComment || !newComment.trim()}>
                  {postingComment ? '...' : 'Post'}
                </button>
              </form>
            ) : (
              <p className="comment-login-hint">Please select your profile to comment.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MemoryViewerModal;
