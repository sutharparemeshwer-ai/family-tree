import React, { useState } from 'react';
import api from '../utils/api'; // Import the api utility
import axios from 'axios';
import './AddMemberForm.css';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const AddMemberForm = ({ relationType, onCancel, relativeToId, onMemberAdded, customEndpoint }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    description: '',
    birthDate: '',
    anniversaryDate: ''
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
    if (formData.birthDate) data.append('birthDate', formData.birthDate);
    if (formData.anniversaryDate) data.append('anniversaryDate', formData.anniversaryDate);
    
    if (profileImage) {
      data.append('profileImage', profileImage);
    }
    data.append('relationType', relationType); // Always append relationType
    // Only append relativeToId if not adding self
    if (relationType !== 'Self') {
      data.append('relativeToId', relativeToId);
    }

    try {
      let res;
      if (customEndpoint) {
        // Use direct axios call for shared view
        res = await axios.post(customEndpoint, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Use api utility for standard authenticated view
        res = await api.post('/members', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      if (onMemberAdded) {
        onMemberAdded(res.data.message || 'Member added successfully!');
      } else {
        onCancel(); // Fallback to just closing modal
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'An error occurred.');
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
          
          <div className="form-row">
            <div className="date-input-group">
              <label>Date of Birth</label>
              <input type="date" name="birthDate" onChange={handleInputChange} />
            </div>
            <div className="date-input-group">
              <label>Anniversary (Optional)</label>
              <input type="date" name="anniversaryDate" onChange={handleInputChange} />
            </div>
          </div>

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