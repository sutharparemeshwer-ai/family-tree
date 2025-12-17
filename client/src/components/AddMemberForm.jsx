import React, { useState } from 'react';
import api, { SERVER_URL } from '../utils/api'; // Import the api utility
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './CustomDatePicker.css'; // Import custom styles
import './AddMemberForm.css';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const AddMemberForm = ({ relationType, onCancel, relativeToId, onMemberAdded, customEndpoint, customHeaders, editingMember }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    description: '',
    birthDate: null,
    anniversaryDate: null,
    deathDate: null
  });
  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Define min and max date objects for the year range
  const minDate = new Date(1800, 0, 1);
  const maxDate = new Date(2040, 11, 31);

  // Populate form for editing
  React.useEffect(() => {
    if (editingMember) {
      setFormData({
        firstName: editingMember.first_name || '',
        lastName: editingMember.last_name || '',
        nickname: editingMember.nickname || '',
        description: editingMember.description || '',
        birthDate: editingMember.birth_date ? new Date(editingMember.birth_date) : null,
        anniversaryDate: editingMember.anniversary_date ? new Date(editingMember.anniversary_date) : null,
        deathDate: editingMember.death_date ? new Date(editingMember.death_date) : null,
      });
      if (editingMember.profile_img_url) {
        setPreview(`${SERVER_URL}${editingMember.profile_img_url}`);
      }
    }
  }, [editingMember]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date, name) => {
    setFormData(prev => ({ ...prev, [name]: date }));
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
    
    if (formData.birthDate) data.append('birthDate', formData.birthDate.toISOString().split('T')[0]);
    if (formData.anniversaryDate) data.append('anniversaryDate', formData.anniversaryDate.toISOString().split('T')[0]);
    if (formData.deathDate) data.append('deathDate', formData.deathDate.toISOString().split('T')[0]);
    
    if (profileImage) {
      data.append('profileImage', profileImage);
    }

    // Only append relation info if NOT editing
    if (!editingMember) {
        data.append('relationType', relationType);
        if (relationType !== 'Self') {
            data.append('relativeToId', relativeToId);
        }
    }

    try {
      let res;
      if (editingMember) {
        // Update existing member
        res = await api.put(`/members/${editingMember.id}`, data);
      } else if (customEndpoint) {
        // Shared view add (using axios directly to bypass default interceptors if needed, or pass custom headers)
        res = await axios.post(customEndpoint, data, { headers: customHeaders });
      } else {
        // Standard add
        res = await api.post('/members', data);
      }
      
      if (onMemberAdded) {
        onMemberAdded(res.data.message || (editingMember ? 'Member updated!' : 'Member added!'));
      } else {
        onCancel();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-member-form" onSubmit={handleSubmit}>
      <h3 className="form-heading">{editingMember ? 'Edit Member' : `Add ${relationType}`}</h3>
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
              <DatePicker
                selected={formData.birthDate}
                onChange={(date) => handleDateChange(date, 'birthDate')}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select Date"
                className="custom-datepicker-input"
                wrapperClassName="custom-datepicker-wrapper"
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={100}
                minDate={minDate} // Set minDate
                maxDate={maxDate} // Set maxDate
              />
            </div>
            
            {/* Show Anniversary only for Spouse, or generally if preferred */}
            <div className="date-input-group">
              <label>Anniversary (Optional)</label>
              <DatePicker
                selected={formData.anniversaryDate}
                onChange={(date) => handleDateChange(date, 'anniversaryDate')}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select Date"
                className="custom-datepicker-input"
                wrapperClassName="custom-datepicker-wrapper"
                showYearDropdown
                scrollableYearDropdown
                minDate={minDate} // Set minDate
                maxDate={maxDate} // Set maxDate
              />
            </div>
          </div>

           <div className="form-row">
             <div className="date-input-group">
              <label>Date of Death (Optional)</label>
              <DatePicker
                selected={formData.deathDate}
                onChange={(date) => handleDateChange(date, 'deathDate')}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select Date"
                className="custom-datepicker-input"
                wrapperClassName="custom-datepicker-wrapper"
                showYearDropdown
                scrollableYearDropdown
                minDate={minDate} // Set minDate
                maxDate={maxDate} // Set maxDate
              />
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