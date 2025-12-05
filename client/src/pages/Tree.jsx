import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import AddMemberForm from '../components/AddMemberForm';
import MemberCard from '../components/MemberCard'; // Import MemberCard
import api from '../utils/api'; // Import the api utility
import './Tree.css';


const Tree = () => {
  const [user, setUser] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [relationType, setRelationType] = useState('');
  const [relativeToId, setRelativeToId] = useState(null); // ID of the member to whom we are adding a relative
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // State for success message

  const serverUrl = 'http://localhost:5000';

  // Function to fetch family members
  const fetchFamilyMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      const response = await api.get('/members');
      setFamilyMembers(response.data);
      return response.data; // Return data for immediate use
    } catch (err) {
      console.error('Error fetching family members:', err);
      setMembersError('Failed to load family members.');
      return [];
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const currentUser = JSON.parse(storedUser);
      setUser(currentUser);
      fetchFamilyMembers(); // Fetch members once user is loaded
    }
  }, [fetchFamilyMembers]);


  const handleAddRelative = (type, targetMemberId) => {
    setRelationType(type);
    setRelativeToId(targetMemberId); // Set the ID of the member whose '+' was clicked
    setModalOpen(true);
    setSuccessMessage(''); // Clear success message when opening modal
  };

  const handleAddSelf = () => {
    setRelationType('Self');
    setRelativeToId(null); // No relative to link to when adding self
    setModalOpen(true);
    setSuccessMessage(''); // Clear success message when opening modal
  };

  const handleMemberAdded = (message) => {
    setModalOpen(false); // Close modal
    setSuccessMessage(message || 'Member added successfully!'); // Set success message
    fetchFamilyMembers(); // Re-fetch members to update the list
  };

  // Find the main user's card (the one logged in)
  // This should be the root of the tree, which is the member whose tree_owner_id matches user.id
  // and who has no parents (father_id and mother_id are null).
  const mainUserMember = familyMembers.find(member => 
    member.tree_owner_id === user?.id && !member.father_id && !member.mother_id
  );

  // Find the father of the main user
  const fatherOfMainUser = mainUserMember && mainUserMember.father_id 
    ? familyMembers.find(member => member.id === mainUserMember.father_id)
    : null;

  // Find the mother of the main user
  const motherOfMainUser = mainUserMember && mainUserMember.mother_id 
    ? familyMembers.find(member => member.id === mainUserMember.mother_id)
    : null;

  // Find the spouse of the main user
  const spouseOfMainUser = mainUserMember && mainUserMember.spouse_id 
    ? familyMembers.find(member => member.id === mainUserMember.spouse_id)
    : null;

  return (
    <div className="tree-page-container">
      <Navbar />
      <div className="tree-content">
        {loadingMembers && <p>Loading family members...</p>}
        {membersError && <p className="error-message">{membersError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message */}
        
        {!loadingMembers && !membersError && (
          <div className="tree-visualization">
            {/* If no main user member, prompt to add self */}
            {!mainUserMember && (
              <div className="add-self-prompt">
                <p>You haven't added yourself to the family tree yet.</p>
                <button className="hero-cta-btn" onClick={handleAddSelf}>Add Myself</button>
              </div>
            )}

            {mainUserMember && (
              <>
                {/* Parents Row */}
                {(fatherOfMainUser || motherOfMainUser) && (
                  <>
                    <div className="generation-row parents-row">
                      {fatherOfMainUser && (
                        <MemberCard 
                          member={fatherOfMainUser} 
                          serverUrl={serverUrl} 
                          onAddRelative={handleAddRelative} 
                        />
                      )}
                      {motherOfMainUser && (
                        <MemberCard 
                          member={motherOfMainUser} 
                          serverUrl={serverUrl} 
                          onAddRelative={handleAddRelative} 
                        />
                      )}
                    </div>
                    <div className="connection-line vertical"></div>
                  </>
                )}

                {/* User and Spouse Row */}
                <div className="generation-row user-and-spouse-row">
                  <MemberCard 
                    member={mainUserMember} 
                    serverUrl={serverUrl} 
                    onAddRelative={handleAddRelative} 
                  />
                  {spouseOfMainUser && (
                    <>
                      <div className="connection-line horizontal"></div>
                      <MemberCard 
                        member={spouseOfMainUser} 
                        serverUrl={serverUrl} 
                        onAddRelative={handleAddRelative} 
                      />
                    </>
                  )}
                </div>
                {/* Placeholder for Children Row */}
                {/* <div className="connection-line vertical"></div> */}
                {/* <div className="generation-row children-row"></div> */}
              </>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <AddMemberForm 
          relationType={relationType} 
          onCancel={() => setModalOpen(false)}
          relativeToId={relativeToId} // Pass the ID of the member whose '+' was clicked
          onMemberAdded={handleMemberAdded} 
        />
      </Modal>
    </div>
  );
};

export default Tree;

