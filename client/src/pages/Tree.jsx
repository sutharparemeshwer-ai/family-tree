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

  // Auto-hide success message after 0.5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);


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

  const handleMemberAdded = async (message) => {
    console.log('Member added, refreshing data...');
    setModalOpen(false); // Close modal
    setSuccessMessage(message || 'Member added successfully!'); // Set success message

    // Re-fetch members to update the list
    await fetchFamilyMembers();
    console.log('Data refreshed after adding member');
  };

  // Helper function to find the logged-in user's member
  const findLoggedInUserMember = () => {
    return familyMembers.find(member =>
      member.tree_owner_id === user?.id &&
      member.first_name === user?.first_name &&
      member.last_name === user?.last_name
    );
  };

  // Helper function to find parent of a member
  const findParent = (memberId, type) => {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return null;

    const parentId = type === 'father' ? member.father_id : member.mother_id;
    return parentId ? familyMembers.find(m => m.id === parentId) : null;
  };

  // Helper function to find spouse of a member
  const findSpouse = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    if (member && member.spouse_id) {
      return familyMembers.find(m => m.id === member.spouse_id);
    }
    return null;
  };

  // Helper function to find children of a member
  const findChildren = (memberId) => {
    return familyMembers.filter(member =>
      member.father_id === memberId || member.mother_id === memberId
    );
  };

  // Helper function to find siblings of the logged-in user
  const findSiblings = (mainUserMember) => {
    if (!mainUserMember) return [];

    const userFatherId = mainUserMember.father_id;
    const userMotherId = mainUserMember.mother_id;

    console.log('Finding siblings for user:', mainUserMember.first_name, 'with parents:', userFatherId, userMotherId);

    // If user has no parents, they can't have siblings
    if (!userFatherId && !userMotherId) {
      console.log('User has no parents, returning empty siblings array');
      return [];
    }

    // Find all family members that share at least one parent with the user
    const siblings = familyMembers.filter(member => {
      // Must be a different person and belong to the same user
      if (member.id === mainUserMember.id || member.tree_owner_id !== user?.id) {
        return false;
      }

      // Check if they share father or mother
      const sharesFather = userFatherId && member.father_id === userFatherId;
      const sharesMother = userMotherId && member.mother_id === userMotherId;

      console.log('Checking member:', member.first_name, 'shares father:', sharesFather, 'shares mother:', sharesMother);

      return sharesFather || sharesMother;
    });

    console.log('Found siblings:', siblings.length, siblings.map(s => s.first_name));
    return siblings;
  };

  // Helper function to find other family members not directly related to main user
  const findOtherMembers = (mainUserMember, siblings = []) => {
    if (!mainUserMember) return [];

    const relatedIds = new Set([mainUserMember.id]);

    // Add parents
    if (mainUserMember.father_id) relatedIds.add(mainUserMember.father_id);
    if (mainUserMember.mother_id) relatedIds.add(mainUserMember.mother_id);

    // Add spouse
    if (mainUserMember.spouse_id) relatedIds.add(mainUserMember.spouse_id);

    // Add children
    const children = findChildren(mainUserMember.id);
    children.forEach(child => relatedIds.add(child.id));

    // Add siblings
    siblings.forEach(sibling => relatedIds.add(sibling.id));

    // Add grandparents (parents of parents)
    const father = findParent(mainUserMember.id, 'father');
    const mother = findParent(mainUserMember.id, 'mother');

    if (father) {
      if (father.father_id) relatedIds.add(father.father_id);
      if (father.mother_id) relatedIds.add(father.mother_id);
    }
    if (mother) {
      if (mother.father_id) relatedIds.add(mother.father_id);
      if (mother.mother_id) relatedIds.add(mother.mother_id);
    }

    return familyMembers.filter(member =>
      member.tree_owner_id === user?.id && !relatedIds.has(member.id)
    );
  };

  const loggedInUserMember = findLoggedInUserMember();
  const father = loggedInUserMember ? findParent(loggedInUserMember.id, 'father') : null;
  const mother = loggedInUserMember ? findParent(loggedInUserMember.id, 'mother') : null;

  // Find grandparents
  const paternalGrandfather = father ? findParent(father.id, 'father') : null;
  const paternalGrandmother = father ? findParent(father.id, 'mother') : null;
  const maternalGrandfather = mother ? findParent(mother.id, 'father') : null;
  const maternalGrandmother = mother ? findParent(mother.id, 'mother') : null;

  const spouse = loggedInUserMember ? findSpouse(loggedInUserMember.id) : null;
  const children = loggedInUserMember ? findChildren(loggedInUserMember.id) : [];
  const siblings = loggedInUserMember ? findSiblings(loggedInUserMember) : [];
  const otherMembers = findOtherMembers(loggedInUserMember, siblings);

  // Debug siblings display
  console.log('=== SIBLINGS DISPLAY DEBUG ===');
  console.log('Logged in user member:', loggedInUserMember);
  console.log('Found siblings:', siblings);
  console.log('Siblings length:', siblings.length);
  console.log('Siblings container should render:', siblings.length > 0);

  return (
    <div className="tree-page-container">
      <Navbar />
      <div className="tree-content">
        {loadingMembers && <p>Loading family members...</p>}
        {membersError && <p className="error-message">{membersError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>} {/* Display success message */}
        
        {!loadingMembers && !membersError && (
          <div className="tree-visualization">
            {/* If no family members, prompt to add self */}
            {familyMembers.length === 0 && (
              <div className="add-self-prompt">
                <p>You haven't added yourself to the family tree yet.</p>
                <button className="hero-cta-btn" onClick={handleAddSelf}>Add Myself</button>
              </div>
            )}

            {familyMembers.length > 0 && (
              <div className="family-tree">
                {/* Grandparents Row */}
                {(paternalGrandfather || paternalGrandmother || maternalGrandfather || maternalGrandmother) && (
                  <div className="generation-section">
                    <h3 className="generation-title">Grandparents</h3>
                    <div className="generation-row grandparents-row">
                      {/* Paternal Grandparents */}
                      {(paternalGrandfather || paternalGrandmother) && (
                        <div className="grandparent-pair">
                          {paternalGrandfather && (
                            <MemberCard
                              member={paternalGrandfather}
                              serverUrl={serverUrl}
                              onAddRelative={handleAddRelative}
                            />
                          )}
                          {paternalGrandmother && (
                            <MemberCard
                              member={paternalGrandmother}
                              serverUrl={serverUrl}
                              onAddRelative={handleAddRelative}
                            />
                          )}
                        </div>
                      )}
                      {/* Maternal Grandparents */}
                      {(maternalGrandfather || maternalGrandmother) && (
                        <div className="grandparent-pair">
                          {maternalGrandfather && (
                            <MemberCard
                              member={maternalGrandfather}
                              serverUrl={serverUrl}
                              onAddRelative={handleAddRelative}
                            />
                          )}
                          {maternalGrandmother && (
                            <MemberCard
                              member={maternalGrandmother}
                              serverUrl={serverUrl}
                              onAddRelative={handleAddRelative}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="connection-line vertical"></div>
                  </div>
                )}

                {/* Parents Row */}
                {(father || mother) && (
                  <div className="generation-section">
                    <h3 className="generation-title">Parents</h3>
                    <div className="generation-row parents-row">
                      {father && (
                        <MemberCard
                          member={father}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                      )}
                      {mother && (
                        <MemberCard
                          member={mother}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                      )}
                    </div>
                    {(siblings.length > 0 || loggedInUserMember) && <div className="connection-line vertical"></div>}
                  </div>
                )}

                {/* User and Siblings Row */}
                {loggedInUserMember && (
                  <div className="generation-section">
                    <h3 className="generation-title">You & Siblings ({siblings.length + 1} members)</h3>
                    <div className="generation-row user-siblings-row">
                      {/* Siblings on the left */}
                      <div className="siblings-container">
                        {siblings.length > 0 ? (
                          siblings.map((sibling, index) => (
                            <React.Fragment key={sibling.id}>
                              <MemberCard
                                member={sibling}
                                serverUrl={serverUrl}
                                onAddRelative={handleAddRelative}
                              />
                              {index < siblings.length - 1 && <div className="connection-line horizontal sibling-connector"></div>}
                            </React.Fragment>
                          ))
                        ) : (
                          <div className="empty-siblings">No siblings yet</div>
                        )}
                        {siblings.length > 0 && <div className="connection-line horizontal user-connector"></div>}
                      </div>

                      {/* User and Spouse */}
                      <div className="user-spouse-section">
                        <MemberCard
                          member={loggedInUserMember}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                        {spouse && (
                          <>
                            <div className="connection-line horizontal"></div>
                            <MemberCard
                              member={spouse}
                              serverUrl={serverUrl}
                              onAddRelative={handleAddRelative}
                            />
                          </>
                        )}
                      </div>
                    </div>
                    {children.length > 0 && <div className="connection-line vertical"></div>}
                  </div>
                )}

                {/* Children Row */}
                {children.length > 0 && (
                  <div className="generation-section">
                    <h3 className="generation-title">Children</h3>
                    <div className="generation-row children-row">
                      {children.map(child => (
                        <MemberCard
                          key={child.id}
                          member={child}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Family Members */}
                {otherMembers.length > 0 && (
                  <div className="generation-section">
                    <h3 className="generation-title">Other Family Members</h3>
                    <div className="generation-row">
                      {otherMembers.map(member => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

