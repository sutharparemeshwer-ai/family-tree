const db = require('../db');
const auditController = require('./auditController');

const createMember = async (req, res) => {
  // Note: 'relativeToId' is the ID of the person you clicked the '+' on.
  const { firstName, lastName, nickname, description, relationType, relativeToId } = req.body;
  const tree_owner_id = req.user.userId; // From authMiddleware
  const user_first_name = req.user.first_name;
  const user_last_name = req.user.last_name;
  const profile_img_url = req.file ? `/uploads/${req.file.filename}` : null;

  // Basic validation
  if (!firstName) {
    return res.status(400).json({ message: 'First name is required.' });
  }
  if (relationType !== 'Self' && (!relationType || !relativeToId)) {
    return res.status(400).json({ message: 'Relation type and relative ID are required for non-self members.' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Step 1: Insert the new family member
    // Determine gender based on relationType for siblings
    let gender = null;
    if (relationType === 'Brother') {
      gender = 'male';
    } else if (relationType === 'Sister') {
      gender = 'female';
    }
    
    const insertQuery = `
      INSERT INTO family_members(tree_owner_id, first_name, last_name, nickname, profile_img_url, description, gender, birth_date, anniversary_date)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    const newMemberResult = await client.query(insertQuery, [
      tree_owner_id,
      firstName,
      lastName,
      nickname,
      profile_img_url,
      description,
      gender,
      req.body.birthDate || null,
      req.body.anniversaryDate || null
    ]);
    const newMemberId = newMemberResult.rows[0].id;

    // Step 2: Update the relationship based on the new member's role
    let updateQuery;
    switch (relationType) {
      case 'Self':
        // No relationship update needed for self
        break;
      case 'Father':
        // Set the new person as the father of the existing person
        updateQuery = {
          text: 'UPDATE family_members SET father_id = $1 WHERE id = $2',
          values: [newMemberId, relativeToId],
        };
        break;
      case 'Mother':
        // Set the new person as the mother of the existing person
        updateQuery = {
          text: 'UPDATE family_members SET mother_id = $1 WHERE id = $2',
          values: [newMemberId, relativeToId],
        };
        break;
      case 'Spouse':
        // Create a two-way relationship
        await client.query('UPDATE family_members SET spouse_id = $1 WHERE id = $2', [newMemberId, relativeToId]);
        updateQuery = {
          text: 'UPDATE family_members SET spouse_id = $1 WHERE id = $2',
          values: [relativeToId, newMemberId],
        };
        break;
      case 'Child':
        // Set the current person as a parent of the new child
        // We need to determine if the current person is father or mother
        // For now, we'll check if the current person has any existing children to determine gender
        const existingChildren = await client.query(
          'SELECT * FROM family_members WHERE father_id = $1 OR mother_id = $1',
          [relativeToId]
        );

        if (existingChildren.rows.length > 0) {
          // If this person already has children, check if they're set as father or mother
          const firstChild = existingChildren.rows[0];
          if (firstChild.father_id === relativeToId) {
            // This person is a father
            updateQuery = {
              text: 'UPDATE family_members SET father_id = $1 WHERE id = $2',
              values: [relativeToId, newMemberId],
            };
          } else if (firstChild.mother_id === relativeToId) {
            // This person is a mother
            updateQuery = {
              text: 'UPDATE family_members SET mother_id = $1 WHERE id = $2',
              values: [relativeToId, newMemberId],
            };
          }
        } else {
          // No existing children, assume this person is the father for now
          // This is a simplification - ideally we'd ask the user
          updateQuery = {
            text: 'UPDATE family_members SET father_id = $1 WHERE id = $2',
            values: [relativeToId, newMemberId],
          };
        }
        break;
      case 'Brother':
      case 'Sister':
        // Find the member whose + button was clicked to get their parents
        // The new sibling should share the same parents as this person
        const clickedMember = await client.query(
          'SELECT id, father_id, mother_id FROM family_members WHERE id = $1 AND tree_owner_id = $2',
          [relativeToId, tree_owner_id]
        );

        if (clickedMember.rows.length > 0) {
          const { father_id, mother_id } = clickedMember.rows[0];
          
          console.log('=== ADDING SIBLING DEBUG ===');
          console.log('Clicked member ID:', relativeToId);
          console.log('Clicked member parents:', father_id, mother_id);
          console.log('New sibling ID:', newMemberId);
          console.log('Relation type:', relationType);

          // Create the update query to set the same parents as the clicked person
          let siblingUpdateQuery = 'UPDATE family_members SET ';
          const siblingValues = [];
          const siblingParts = [];

          if (father_id) {
            siblingParts.push(`father_id = $${siblingValues.length + 1}`);
            siblingValues.push(father_id);
          }
          if (mother_id) {
            siblingParts.push(`mother_id = $${siblingValues.length + 1}`);
            siblingValues.push(mother_id);
          }

          if (siblingParts.length > 0) {
            siblingUpdateQuery += siblingParts.join(', ') + ` WHERE id = $${siblingValues.length + 1}`;
            siblingValues.push(newMemberId);

            updateQuery = {
              text: siblingUpdateQuery,
              values: siblingValues,
            };
            console.log('Sibling update query:', updateQuery.text);
            console.log('Sibling update values:', updateQuery.values);
            console.log('New sibling will have parents:', father_id, mother_id);
          } else {
            // Clicked person has no parents, so sibling can't share parents
            console.log('Clicked person has no parents, sibling will not have parent relationships set');
          }
        } else {
          console.log('Could not find clicked member for sibling creation. relativeToId:', relativeToId);
        }
        break;
      default:
        // If relationType is unknown, do not link.
        break;
    }

    if (updateQuery) {
      await client.query(updateQuery);
    }

    await client.query('COMMIT');

    // LOG ACTION
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: user_first_name || 'Owner',
      actorEmail: req.user.email, // Assuming middleware adds this, if not it's fine
      actorType: 'owner',
      actionType: 'ADD_MEMBER',
      targetName: `${firstName} ${lastName}`,
      details: { relation: relationType }
    });

    res.status(201).json({ message: 'Family member added successfully!', newMemberId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating family member:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};


const getMembers = async (req, res) => {
  const tree_owner_id = req.user.userId; // From authMiddleware

  try {
    const result = await db.query(
      'SELECT * FROM family_members WHERE tree_owner_id = $1 ORDER BY id',
      [tree_owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUpcomingEvents = async (req, res) => {
  const tree_owner_id = req.user.userId;

  try {
    const result = await db.query(
      'SELECT id, first_name, last_name, birth_date, anniversary_date, profile_img_url FROM family_members WHERE tree_owner_id = $1',
      [tree_owner_id]
    );

    const members = result.rows;
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    members.forEach(member => {
      // Calculate Next Birthday
      if (member.birth_date) {
        const birthDate = new Date(member.birth_date);
        let nextBirthDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthDate < today) {
          nextBirthDate.setFullYear(today.getFullYear() + 1);
        }
        
        events.push({
          id: member.id,
          memberId: member.id,
          name: `${member.first_name} ${member.last_name || ''}`,
          type: 'Birthday',
          date: nextBirthDate,
          originalDate: member.birth_date,
          profileImgUrl: member.profile_img_url,
          age: nextBirthDate.getFullYear() - birthDate.getFullYear()
        });
      }

      // Calculate Next Anniversary
      if (member.anniversary_date) {
        const annivDate = new Date(member.anniversary_date);
        let nextAnnivDate = new Date(today.getFullYear(), annivDate.getMonth(), annivDate.getDate());
        if (nextAnnivDate < today) {
          nextAnnivDate.setFullYear(today.getFullYear() + 1);
        }

        events.push({
          id: `${member.id}-anniv`,
          memberId: member.id,
          name: `${member.first_name} ${member.last_name || ''}`,
          type: 'Anniversary',
          date: nextAnnivDate,
          originalDate: member.anniversary_date,
          profileImgUrl: member.profile_img_url,
          years: nextAnnivDate.getFullYear() - annivDate.getFullYear()
        });
      }
    });

    // Sort by Date (ascending)
    events.sort((a, b) => a.date - b.date);

    // Take top 5
    const upcomingEvents = events.slice(0, 5);

    res.json(upcomingEvents);

  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateMember = async (req, res) => {
  const memberId = req.params.id;
  const { firstName, lastName, nickname, description, birthDate, anniversaryDate, deathDate } = req.body;
  const tree_owner_id = req.user.userId;

  // Build the update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (firstName) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(firstName);
  }
  if (lastName) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(lastName);
  }
  if (nickname !== undefined) { // Allow clearing nickname
    updates.push(`nickname = $${paramIndex++}`);
    values.push(nickname);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (birthDate !== undefined) {
    updates.push(`birth_date = $${paramIndex++}`);
    values.push(birthDate || null);
  }
  if (anniversaryDate !== undefined) {
    updates.push(`anniversary_date = $${paramIndex++}`);
    values.push(anniversaryDate || null);
  }
  if (deathDate !== undefined) {
    updates.push(`death_date = $${paramIndex++}`); // Assuming column exists
    values.push(deathDate || null);
  }

  if (req.file) {
    updates.push(`profile_img_url = $${paramIndex++}`);
    values.push(`/uploads/${req.file.filename}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update.' });
  }

  values.push(memberId);
  values.push(tree_owner_id);

  const query = `
    UPDATE family_members
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND tree_owner_id = $${paramIndex++}
    RETURNING *;
  `;

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found or unauthorized.' });
    }

    // LOG ACTION
    const updatedMember = result.rows[0];
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: req.user.first_name || 'Owner',
      actorType: 'owner',
      actionType: 'EDIT_MEMBER',
      targetName: `${updatedMember.first_name} ${updatedMember.last_name}`,
      details: { updatedFields: Object.keys(req.body).filter(k => k !== 'tree_owner_id') }
    });

    res.json({ message: 'Member updated successfully', member: result.rows[0] });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMember = async (req, res) => {
  const memberId = req.params.id;
  const tree_owner_id = req.user.userId;

  try {
    // Check if member exists and belongs to user
    const checkQuery = 'SELECT * FROM family_members WHERE id = $1 AND tree_owner_id = $2';
    const checkResult = await db.query(checkQuery, [memberId, tree_owner_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found or unauthorized.' });
    }

    // Delete the member
    // Note: Relationships (father_id, mother_id, spouse_id) pointing to this member 
    // should ideally be set to NULL or handled. For now, we assume simple deletion.
    // If you have foreign key constraints, you might need to update children first.
    // Assuming ON DELETE SET NULL or NO ACTION with manual cleanup.
    
    // Manual cleanup for relationships to prevent orphans/errors if constraints exist
    await db.query('UPDATE family_members SET father_id = NULL WHERE father_id = $1', [memberId]);
    await db.query('UPDATE family_members SET mother_id = NULL WHERE mother_id = $1', [memberId]);
    await db.query('UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1', [memberId]);

    const deleteQuery = 'DELETE FROM family_members WHERE id = $1';
    await db.query(deleteQuery, [memberId]);

    // LOG ACTION
    const deletedMember = checkResult.rows[0];
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: req.user.first_name || 'Owner',
      actorType: 'owner',
      actionType: 'DELETE_MEMBER',
      targetName: `${deletedMember.first_name} ${deletedMember.last_name}`,
      details: { memberId: memberId }
    });

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createMember,
  getMembers,
  getUpcomingEvents,
  updateMember,
  deleteMember
};

