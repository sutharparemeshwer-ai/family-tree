import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './AuthShared.css';

// Icons
const UserIcon = () => (
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

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const EyeIcon = ({ visible }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </>
    )}
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
  const [showPassword, setShowPassword] = useState(false);
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

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !first_name || !last_name || !password) {
      setError('Please fill in all required fields.');
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
      await api.post('/auth/signup', data);
      setMessage('Account created! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Start building your family tree</p>
        </div>

        {error && (
          <div className="auth-error">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}
        
        {message && (
          <div className="auth-error" style={{ background: '#ecfdf5', borderColor: '#d1fae5', color: '#047857' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="profile-upload-container">
            <label htmlFor="profile-image-upload" className="profile-upload-label">
              {preview ? (
                <img src={preview} alt="Preview" className="profile-preview" />
              ) : (
                <div className="upload-placeholder">
                  <CameraIcon />
                  <span>Add Photo</span>
                </div>
              )}
            </label>
            <input 
              id="profile-image-upload"
              type="file" 
              onChange={onFileChange} 
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div className="input-group">
            <div className={`input-field ${email ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <EmailIcon />
              </div>
              <input 
                type="email" 
                name="email" 
                id="signup-email"
                value={email} 
                onChange={onChange} 
                required 
              />
              <label htmlFor="signup-email">Email Address</label>
            </div>

            <div className={`input-field ${first_name ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <UserIcon />
              </div>
              <input 
                type="text" 
                name="first_name" 
                id="first_name"
                value={first_name} 
                onChange={onChange} 
                required 
              />
              <label htmlFor="first_name">First Name</label>
            </div>

            <div className={`input-field ${last_name ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <UserIcon />
              </div>
              <input 
                type="text" 
                name="last_name" 
                id="last_name"
                value={last_name} 
                onChange={onChange} 
                required 
              />
              <label htmlFor="last_name">Last Name</label>
            </div>

            <div className={`input-field ${password ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <PasswordIcon />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                id="signup-password"
                value={password} 
                onChange={onChange} 
                required 
              />
              <label htmlFor="signup-password">Password</label>
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
                tabIndex="-1"
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={loading}>
             {loading ? <span className="loading-spinner"></span> : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;