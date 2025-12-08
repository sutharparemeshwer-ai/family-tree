import React, { useState } from 'react';
import api from '../utils/api'; // Import the api utility
import './AddMemberForm.css';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const AddMemberForm = ({ relationType, onCancel, relativeToId, onMemberAdded }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    description: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData();
    data.append('firstName', formData.firstName);
    data.append('lastName', formData.lastName);
    data.append('nickname', formData.nickname);
    data.append('description', formData.description);
    if (profileImage) {
      data.append('profileImage', profileImage);
    }
    data.append('relationType', relationType); // Always append relationType
    // Only append relativeToId if not adding self
    if (relationType !== 'Self') {
      data.append('relativeToId', relativeToId);
    }

    try {
      const res = await api.post('/members', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log(res.data);
      if (onMemberAdded) {
        onMemberAdded(res.data.message || 'Member added successfully!');
      } else {
        onCancel(); // Fallback to just closing modal
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-member-form" onSubmit={handleSubmit}>
      <h3 className="form-heading">Add {relationType}</h3>
      {error && <p className="form-error">{error}</p>}
      
      <div className="form-section-split">
        <div className="form-details-section">
          <div className="form-row">
            <input type="text" name="firstName" placeholder="First Name" onChange={handleInputChange} required />
            <input type="text" name="lastName" placeholder="Last Name" onChange={handleInputChange} />
          </div>
          <input type="text" name="nickname" placeholder="Nickname" onChange={handleInputChange} />
          <textarea name="description" placeholder="Description" onChange={handleInputChange}></textarea>
        </div>

        <div className="form-image-section">
          <label htmlFor="member-image-upload" className="member-image-label">
            {preview ? (
              <img src={preview} alt="Preview" className="member-image-preview" />
            ) : (
              <div className="upload-placeholder">
                <UploadIcon />
                <span>Upload Photo</span>
              </div>
            )}
          </label>
          <input 
            id="member-image-upload"
            type="file" 
            name="profileImage" 
            onChange={handleFileChange} 
            accept="image/*" 
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn-save" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default AddMemberForm;
