import React, { useState } from 'react';
import api from '../utils/api';
import Modal from './Modal'; // Re-using the existing Modal component
import './MemoryFormModal.css';

const MemoryFormModal = ({ isOpen, onClose, memberId, onMemoryAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || files.length === 0) {
      setError('Title and at least one file are required.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('memberId', memberId);
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post('/memories', formData);
      onMemoryAdded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add memory.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setTitle('');
    setDescription('');
    setFiles([]);
    setPreviews([]);
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <form className="memory-form" onSubmit={handleSubmit}>
        <h3>Add a New Memory</h3>
        {error && <p className="form-error">{error}</p>}

        <input
          type="text"
          placeholder="Memory Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Describe the memory..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        <div className="file-upload-area">
          <label htmlFor="memory-files-upload" className="file-upload-label">
            Click or drag to upload photos/videos
          </label>
          <input
            id="memory-files-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            accept="image/*,video/mp4"
          />
        </div>

        <div className="file-previews">
          {previews.map((preview, index) => (
            <img key={index} src={preview} alt={`Preview ${index + 1}`} className="file-preview-img" />
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Saving...' : 'Save Memory'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MemoryFormModal;
