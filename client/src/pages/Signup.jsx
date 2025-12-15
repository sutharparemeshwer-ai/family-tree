import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

// SVG Icon for the profile image placeholder
const ProfileUploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const UserInputIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PasswordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);


const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, first_name, last_name, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

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
    setMessage('');

    if (!email || !first_name || !last_name || !password) {
      setError('All fields except profile image are required.');
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('email', email);
    data.append('first_name', first_name);
    data.append('last_name', last_name);
    data.append('password', password);
    if (profileImage) {
      data.append('profile_image', profileImage);
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${apiUrl}/auth/signup`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(res.data.message + ' Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <form className="signup-form" onSubmit={onSubmit}>
        <h2 className="form-title">Create Your Account</h2>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        
        <div className="profile-image-section">
          <label htmlFor="profile-image-upload" className="profile-image-label">
            {preview ? (
              <img src={preview} alt="Profile Preview" className="profile-preview" />
            ) : (
              <div className="profile-icon-container">
                <ProfileUploadIcon />
                <span>Add Photo</span>
              </div>
            )}
          </label>
          <input 
            id="profile-image-upload"
            type="file" 
            onChange={onFileChange} 
            accept="image/*"
          />
        </div>

        <div className="input-group">
          <div className="input-row">
            <span className={`input-icon ${email.length > 0 ? 'filled' : ''}`}><EmailIcon /></span>
            <input type="email" name="email" value={email} onChange={onChange} placeholder="Email" required />
          </div>
          <div className="input-row">
            <span className={`input-icon ${first_name.length > 0 ? 'filled' : ''}`}><UserInputIcon /></span>
            <input type="text" name="first_name" value={first_name} onChange={onChange} placeholder="First Name" required />
          </div>
          <div className="input-row">
            <span className={`input-icon ${last_name.length > 0 ? 'filled' : ''}`}><UserInputIcon /></span>
            <input type="text" name="last_name" value={last_name} onChange={onChange} placeholder="Last Name" required />
          </div>
          <div className="input-row">
            <span className={`input-icon ${password.length > 0 ? 'filled' : ''}`}><PasswordIcon /></span>
            <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required />
          </div>
        </div>
        
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
