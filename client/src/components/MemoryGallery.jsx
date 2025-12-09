import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import MemoryCard from './MemoryCard';
import './MemoryGallery.css';

const MemoryGallery = ({ memberId, memberName, onAddMemory }) => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMemories = useCallback(async () => {
    if (!memberId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/memories?memberId=${memberId}`);
      setMemories(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load memories.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDeleteMemory = async (memoryId) => {
    try {
      await api.delete(`/memories/${memoryId}`);
      fetchMemories(); // Re-fetch memories to update the list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete memory.');
    }
  };

  return (
    <div className="memory-gallery-container">
      <header className="gallery-header">
        <h2>Memories with {memberName || '...'}</h2>
        <button className="add-memory-btn" onClick={onAddMemory}>Add Memory</button>
      </header>
      <div className="memory-grid">
        {loading && <p>Loading memories...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && (
          <>
            {memories.length > 0 ? (
              memories.map(memory => (
                <MemoryCard key={memory.id} memory={memory} onDelete={handleDeleteMemory} />
              ))
            ) : (
              <div className="memory-card-placeholder">
                <p>No memories yet for {memberName}. Start by adding one!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MemoryGallery;

