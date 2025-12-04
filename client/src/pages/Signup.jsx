import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

// SVG Icon for the placeholder
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
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
      const res = await axios.post('http://localhost:5000/api/auth/signup', data, {
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
                <UserIcon />
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
          <input type="email" name="email" value={email} onChange={onChange} placeholder="Email" required />
          <input type="text" name="first_name" value={first_name} onChange={onChange} placeholder="First Name" required />
          <input type="text" name="last_name" value={last_name} onChange={onChange} placeholder="Last Name" required />
          <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required />
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
