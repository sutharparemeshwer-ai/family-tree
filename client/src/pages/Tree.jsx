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
    setModalOpen(false); // Close modal
    setSuccessMessage(message || 'Member added successfully!'); // Set success message

    // Small delay to ensure backend has finished updating relationships
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Re-fetch members to update the list
    await fetchFamilyMembers();
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

  // Helper function to find siblings of any member
  const findSiblingsOfMember = (memberToFindSiblingsFor) => {
    if (!memberToFindSiblingsFor) return [];

    const memberFatherId = memberToFindSiblingsFor.father_id;
    const memberMotherId = memberToFindSiblingsFor.mother_id;

    // If member has no parents, they can't have siblings based on shared parents
    if (!memberFatherId && !memberMotherId) {
      return [];
    }

    // Find all family members that share at least one parent with this member
    const siblings = familyMembers.filter(member => {
      // Must be a different person and belong to the same user
      if (member.id === memberToFindSiblingsFor.id || member.tree_owner_id !== user?.id) {
        return false;
      }

      // Check if they share father or mother
      const sharesFather = memberFatherId && member.father_id === memberFatherId;
      const sharesMother = memberMotherId && member.mother_id === memberMotherId;

      // Must share at least one parent
      return sharesFather || sharesMother;
    });

    return siblings;
  };

  // Helper function to find siblings of the logged-in user
  const findSiblings = (mainUserMember) => {
    return findSiblingsOfMember(mainUserMember);
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
  
  // Find siblings of parents (uncles/aunts) FIRST
  const fatherSiblings = father ? findSiblingsOfMember(father) : [];
  const motherSiblings = mother ? findSiblingsOfMember(mother) : [];
  const allParentSiblings = [...fatherSiblings, ...motherSiblings];
  const parentSiblingIds = new Set(allParentSiblings.map(s => s.id));
  
  // Debug: Log parent siblings with detailed info
  console.log('=== PARENT SIBLINGS DEBUG ===');
  if (father) {
    console.log('Father:', father.first_name, 'ID:', father.id, 'Parents:', father.father_id, father.mother_id);
    console.log('Father siblings found:', fatherSiblings.length);
    fatherSiblings.forEach(s => {
      console.log(`  - ${s.first_name} (ID: ${s.id}, Parents: ${s.father_id}, ${s.mother_id})`);
      console.log(`    Shares father: ${father.father_id && s.father_id === father.father_id}`);
      console.log(`    Shares mother: ${father.mother_id && s.mother_id === father.mother_id}`);
    });
  }
  if (mother) {
    console.log('Mother:', mother.first_name, 'ID:', mother.id, 'Parents:', mother.father_id, mother.mother_id);
    console.log('Mother siblings found:', motherSiblings.length);
    motherSiblings.forEach(s => {
      console.log(`  - ${s.first_name} (ID: ${s.id}, Parents: ${s.father_id}, ${s.mother_id})`);
      console.log(`    Shares father: ${mother.father_id && s.father_id === mother.father_id}`);
      console.log(`    Shares mother: ${mother.mother_id && s.mother_id === mother.mother_id}`);
    });
  }
  console.log('Total parent siblings:', allParentSiblings.length);
  console.log('Parent sibling IDs to exclude:', Array.from(parentSiblingIds));
  
  // Find user's siblings, but EXCLUDE parent siblings
  // Parent siblings should only appear in Parents section, not in Your section
  const allSiblingsRaw = loggedInUserMember ? findSiblings(loggedInUserMember) : [];
  
  // Debug: Log user siblings before exclusion
  if (allSiblingsRaw.length > 0) {
    console.log('=== USER SIBLINGS BEFORE EXCLUSION ===');
    console.log('User:', loggedInUserMember?.first_name, 'ID:', loggedInUserMember?.id, 'Parents:', loggedInUserMember?.father_id, loggedInUserMember?.mother_id);
    console.log('Raw user siblings:', allSiblingsRaw.map(s => `${s.first_name} (ID: ${s.id}, Parents: ${s.father_id}, ${s.mother_id})`));
  }
  
  const allSiblings = allSiblingsRaw.filter(sibling => {
    const isExcluded = parentSiblingIds.has(sibling.id);
    if (isExcluded) {
      console.log(`EXCLUDING ${sibling.first_name} (ID: ${sibling.id}) from user siblings - it's a parent sibling`);
    }
    return !isExcluded;
  });
  
  // Debug: Log final user siblings with detailed parent comparison
  if (allSiblings.length > 0 || allSiblingsRaw.length > 0) {
    console.log('=== FINAL USER SIBLINGS ===');
    console.log('User parent IDs:', loggedInUserMember?.father_id, loggedInUserMember?.mother_id);
    console.log('Father parent IDs:', father?.father_id, father?.mother_id);
    console.log('Mother parent IDs:', mother?.father_id, mother?.mother_id);
    console.log('All raw siblings with parent IDs:', allSiblingsRaw.map(s => ({
      name: s.first_name,
      id: s.id,
      father_id: s.father_id,
      mother_id: s.mother_id,
      isParentSibling: parentSiblingIds.has(s.id)
    })));
    console.log('Final user siblings:', allSiblings.map(s => `${s.first_name} (ID: ${s.id}, Parents: ${s.father_id}, ${s.mother_id})`));
  }
  
  // Separate user's siblings into brothers and sisters
  const brothers = allSiblings.filter(sibling => sibling.gender === 'male');
  const sisters = allSiblings.filter(sibling => sibling.gender === 'female');
  const siblingsWithoutGender = allSiblings.filter(sibling => !sibling.gender || (sibling.gender !== 'male' && sibling.gender !== 'female'));
  
  // Separate parent siblings into brothers and sisters
  const fatherBrothers = fatherSiblings.filter(sibling => sibling.gender === 'male');
  const fatherSisters = fatherSiblings.filter(sibling => sibling.gender === 'female');
  const motherBrothers = motherSiblings.filter(sibling => sibling.gender === 'male');
  const motherSisters = motherSiblings.filter(sibling => sibling.gender === 'female');
  
  const otherMembers = findOtherMembers(loggedInUserMember, [...allSiblings, ...allParentSiblings]);

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
                      {/* Father and his siblings */}
                      {father && (
                        <div className="parent-with-siblings">
                          {/* Father's brothers */}
                          {fatherBrothers.length > 0 && (
                            <div className="siblings-group parent-siblings-group">
                              {fatherBrothers.map((brother, index) => (
                                <React.Fragment key={brother.id}>
                                  <MemberCard
                                    member={brother}
                                    serverUrl={serverUrl}
                                    onAddRelative={handleAddRelative}
                                  />
                                  {index < fatherBrothers.length - 1 && <div className="connection-line horizontal"></div>}
                                </React.Fragment>
                              ))}
                              <div className="connection-line horizontal"></div>
                            </div>
                          )}
                          
                          {/* Father */}
                          <MemberCard
                            member={father}
                            serverUrl={serverUrl}
                            onAddRelative={handleAddRelative}
                          />
                          
                          {/* Father's sisters */}
                          {fatherSisters.length > 0 && (
                            <div className="siblings-group parent-siblings-group">
                              <div className="connection-line horizontal"></div>
                              {fatherSisters.map((sister, index) => (
                                <React.Fragment key={sister.id}>
                                  <MemberCard
                                    member={sister}
                                    serverUrl={serverUrl}
                                    onAddRelative={handleAddRelative}
                                  />
                                  {index < fatherSisters.length - 1 && <div className="connection-line horizontal"></div>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Mother and her siblings */}
                      {mother && (
                        <div className="parent-with-siblings">
                          {/* Mother's brothers */}
                          {motherBrothers.length > 0 && (
                            <div className="siblings-group parent-siblings-group">
                              {motherBrothers.map((brother, index) => (
                                <React.Fragment key={brother.id}>
                                  <MemberCard
                                    member={brother}
                                    serverUrl={serverUrl}
                                    onAddRelative={handleAddRelative}
                                  />
                                  {index < motherBrothers.length - 1 && <div className="connection-line horizontal"></div>}
                                </React.Fragment>
                              ))}
                              <div className="connection-line horizontal"></div>
                            </div>
                          )}
                          
                          {/* Mother */}
                          <MemberCard
                            member={mother}
                            serverUrl={serverUrl}
                            onAddRelative={handleAddRelative}
                          />
                          
                          {/* Mother's sisters */}
                          {motherSisters.length > 0 && (
                            <div className="siblings-group parent-siblings-group">
                              <div className="connection-line horizontal"></div>
                              {motherSisters.map((sister, index) => (
                                <React.Fragment key={sister.id}>
                                  <MemberCard
                                    member={sister}
                                    serverUrl={serverUrl}
                                    onAddRelative={handleAddRelative}
                                  />
                                  {index < motherSisters.length - 1 && <div className="connection-line horizontal"></div>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {(allSiblings.length > 0 || loggedInUserMember) && <div className="connection-line vertical"></div>}
                  </div>
                )}

                {/* User and Siblings Row */}
                {loggedInUserMember && (
                  <div className="generation-section">
                    <h3 className="generation-title">You & Siblings ({allSiblings.length + 1} members)</h3>
                    <div className="generation-row user-siblings-row">
                      {/* Brothers section - Left side */}
                      {brothers.length > 0 && (
                        <div className="siblings-group brothers-group">
                          {brothers.map((brother, index) => (
                            <React.Fragment key={brother.id}>
                              <MemberCard
                                member={brother}
                                serverUrl={serverUrl}
                                onAddRelative={handleAddRelative}
                              />
                              {index < brothers.length - 1 && <div className="connection-line horizontal"></div>}
                            </React.Fragment>
                          ))}
                          <div className="connection-line horizontal siblings-to-user-connector"></div>
                        </div>
                      )}

                      {/* User and Spouse section - Middle container */}
                      <div className="user-spouse-container">
                        <MemberCard
                          member={loggedInUserMember}
                          serverUrl={serverUrl}
                          onAddRelative={handleAddRelative}
                        />
                        {spouse && (
                          <MemberCard
                            member={spouse}
                            serverUrl={serverUrl}
                            onAddRelative={handleAddRelative}
                          />
                        )}
                      </div>

                      {/* Sisters section - Right side */}
                      {sisters.length > 0 && (
                        <div className="siblings-group sisters-group">
                          <div className="connection-line horizontal siblings-to-user-connector"></div>
                          {sisters.map((sister, index) => (
                            <React.Fragment key={sister.id}>
                              <MemberCard
                                member={sister}
                                serverUrl={serverUrl}
                                onAddRelative={handleAddRelative}
                              />
                              {index < sisters.length - 1 && <div className="connection-line horizontal"></div>}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Siblings without gender (fallback) */}
                      {siblingsWithoutGender.length > 0 && (
                        <div className="siblings-group">
                          {brothers.length === 0 && <div className="connection-line horizontal siblings-to-user-connector"></div>}
                          {siblingsWithoutGender.map((sibling, index) => (
                            <React.Fragment key={sibling.id}>
                              <MemberCard
                                member={sibling}
                                serverUrl={serverUrl}
                                onAddRelative={handleAddRelative}
                              />
                              {index < siblingsWithoutGender.length - 1 && <div className="connection-line horizontal"></div>}
                            </React.Fragment>
                          ))}
                          {brothers.length > 0 && <div className="connection-line horizontal siblings-to-user-connector"></div>}
                        </div>
                      )}

                      {/* Show empty state if no siblings */}
                      {allSiblings.length === 0 && (
                        <div className="empty-siblings-placeholder">Add siblings to see them here</div>
                      )}
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