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
        // Find the logged-in user's member record to get their parents
        const userMember = await client.query(
          'SELECT id, father_id, mother_id FROM family_members WHERE tree_owner_id = $1',
          [tree_owner_id]
        );

        if (userMember.rows.length > 0) {
          const { father_id, mother_id } = userMember.rows[0];

          // Create the update query to set the same parents as the logged-in user
          let siblingUpdateQuery = 'UPDATE family_members SET ';
          const siblingValues = [];
          const siblingParts = [];

          if (father_id) {
            siblingParts.push('father_id = $1');
            siblingValues.push(father_id);
          }
          if (mother_id) {
            siblingParts.push('mother_id = $2');
            siblingValues.push(mother_id);
          }

          if (siblingParts.length > 0) {
            siblingUpdateQuery += siblingParts.join(', ') + ' WHERE id = $' + (siblingValues.length + 1);
            siblingValues.push(newMemberId);

            updateQuery = {
              text: siblingUpdateQuery,
              values: siblingValues,
            };
          }
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

