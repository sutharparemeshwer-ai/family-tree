import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Settings.css';

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
);

const Settings = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    old_password: '',
    password: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setFormData(prev => ({
        ...prev,
        first_name: storedUser.first_name,
        last_name: storedUser.last_name,
        email: storedUser.email,
      }));
      if (storedUser.profile_img_url) {
        setPreview(`${serverUrl}${storedUser.profile_img_url}`);
      }
    }
  }, []);

  const { first_name, last_name, email, old_password, password, confirmPassword } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (password && !old_password) {
      setError('Please enter your current password to set a new one.');
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('first_name', first_name);
    data.append('last_name', last_name);
    data.append('email', email);
    if (password) {
      data.append('password', password);
      data.append('old_password', old_password);
    }
    if (profileImage) {
      data.append('profile_image', profileImage);
    }

    try {
      const res = await api.patch('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      localStorage.setItem('user', JSON.stringify(res.data.user));
      setSuccess('Profile updated successfully! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while updating.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page-container">
      <Navbar />
      <div className="settings-content">
        <div className="settings-form-container">
          <div className="settings-header">
            <h2>Profile Settings</h2>
            <p>Update your photo and personal details.</p>
          </div>
          
          <form className="settings-form" onSubmit={onSubmit}>
            <div className="settings-form-body">
              {/* --- Left Column --- */}
              <div className="settings-avatar-section">
                <label htmlFor="profile-image-upload" className="avatar-upload-label">
                  <img src={preview || 'https://via.placeholder.com/160'} alt="Profile Preview" className="avatar-preview" />
                  <div className="upload-overlay">
                    <CameraIcon />
                    <span>Change</span>
                  </div>
                </label>
                <input id="profile-image-upload" type="file" onChange={onFileChange} accept="image/*" />
                <p className="field-hint">JPG, GIF or PNG. 1MB max.</p>
              </div>

              {/* --- Right Column --- */}
              <div className="settings-details-section">
                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="first_name">First Name</label>
                    <input type="text" id="first_name" name="first_name" value={first_name} onChange={onChange} required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input type="text" id="last_name" name="last_name" value={last_name} onChange={onChange} required />
                  </div>
                  <div className="input-group full-width">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" name="email" value={email} onChange={onChange} required />
                  </div>
                </div>

                <hr />

                <div className="form-grid">
                  <div className="input-group full-width">
                    <label htmlFor="old_password">Current Password</label>
                    <input type="password" id="old_password" name="old_password" value={old_password} onChange={onChange} placeholder="Enter current password to change it" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="password">New Password</label>
                    <input type="password" id="password" name="password" value={password} onChange={onChange} placeholder="Leave blank to keep current" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={onChange} />
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="form-message error">{error}</p>}
            {success && <p className="form-message success">{success}</p>}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
