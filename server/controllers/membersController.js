const db = require('../db');

const createMember = async (req, res) => {
  // Note: 'relativeToId' is the ID of the person you clicked the '+' on.
  const { firstName, lastName, nickname, description, relationType, relativeToId } = req.body;
  const tree_owner_id = req.user.userId; // From authMiddleware
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
    const insertQuery = `
      INSERT INTO family_members(tree_owner_id, first_name, last_name, nickname, profile_img_url, description)
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const newMemberResult = await client.query(insertQuery, [
      tree_owner_id,
      firstName,
      lastName,
      nickname,
      profile_img_url,
      description,
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
        // This case is more complex. For now, we'll assume the user needs to specify
        // the other parent later. We just link the child to the current person.
        // A more advanced implementation might ask "who is the other parent?".
        // We also don't know the gender of the current person (relativeToId).
        // We will leave this logic to be improved upon later.
        // For now, we just create the child and don't link them as a child.
        // A better approach would be to update the child's father_id or mother_id.
        console.log('Add Child logic needs to be fully implemented based on gender of parent.');
        break;
      default:
        // If relationType is unknown, do not link.
        break;
    }

    if (updateQuery) {
      await client.query(updateQuery);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Family member added successfully!', newMemberId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating family member:', error);
    res.status(500).json({ message: 'Internal server error' });
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

module.exports = {
  createMember,
  getMembers,
};

