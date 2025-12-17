const db = require('../db');
const crypto = require('crypto');
const auditController = require('./auditController');

// Generate a random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.generateShareLink = async (req, res) => {
  try {
    const userId = req.user.userId; // From authMiddleware
    const { permission, label, guest_email } = req.body; // 'view' or 'edit', label is optional name

    if (!['view', 'edit'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission type' });
    }

    const token = generateToken();

    // Store token in database (using new share_links table)
    // Note: guest_email column must exist
    const result = await db.query(
      'INSERT INTO share_links (token, user_id, permission, label, guest_email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [token, userId, permission, label || 'Untitled Link', guest_email || null]
    );

    res.json({ 
      message: 'Share link generated', 
      link: result.rows[0]
    });

  } catch (err) {
    console.error('Error generating share link:', err);
    res.status(500).json({ error: 'Server error generating link. DB schema might be outdated.' });
  }
};

// Get all active links for the logged-in user
exports.getLinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      'SELECT * FROM share_links WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ error: 'Server error fetching links' });
  }
};

// Revoke (Delete) a link
exports.deleteLink = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM share_links WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ message: 'Link revoked successfully' });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Server error deleting link' });
  }
};

// Verify a token (Used by Guest Login page)
exports.verifyLink = async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await db.query(
      `SELECT s.*, u.first_name as owner_name 
       FROM share_links s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid or expired link' });
    }

    const linkData = result.rows[0];
    
    // Update last accessed
    await db.query('UPDATE share_links SET last_accessed_at = NOW() WHERE id = $1', [linkData.id]);

    res.json({ 
      valid: true, 
      label: linkData.label,
      ownerName: linkData.owner_name,
      permission: linkData.permission,
      linkId: linkData.id
    });

  } catch (err) {
    console.error('Error verifying link:', err);
    res.status(500).json({ error: 'Server error verifying link' });
  }
};

// Get Shared Tree Data (Authenticated via Token, used AFTER guest login or for View Only)
exports.getSharedTree = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const tokenResult = await db.query(
      'SELECT * FROM share_links WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      // Fallback to old table for backward compatibility if needed, or just fail
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    const { user_id, permission } = tokenResult.rows[0];

    // Fetch members for the owner of the tree
    const membersResult = await db.query(
      'SELECT * FROM family_members WHERE tree_owner_id = $1 ORDER BY id ASC',
      [user_id]
    );

    res.json({
      permission,
      ownerId: user_id,
      members: membersResult.rows
    });

  } catch (err) {
    console.error('Error fetching shared tree:', err);
    res.status(500).json({ error: 'Server error fetching tree' });
  }
};

// Add member via share token (for 'edit' permission) - Now with Auditing!
exports.addMemberViaToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // 1. Verify Token
    const tokenResult = await db.query(
      'SELECT * FROM share_links WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid link' });
    }

    const linkData = tokenResult.rows[0];
    const { user_id: tree_owner_id, permission, id: linkId } = linkData;

    if (permission !== 'edit') {
      return res.status(403).json({ error: 'This link is read-only' });
    }

    // 2. Identify the Guest (Sent from frontend header or body)
    // We expect the frontend to send 'X-Guest-Name' and 'X-Guest-Email' headers
    const guestName = req.headers['x-guest-name'] || 'Unknown Guest';
    const guestEmail = req.headers['x-guest-email'] || 'No Email';

    const { 
      firstName, 
      lastName, 
      nickname, 
      description,
      gender, 
      relationType, 
      relativeToId 
    } = req.body;
    
    if (!firstName) {
      return res.status(400).json({ error: 'First name is required' });
    }

    const profileImgUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // --- Relationship Logic (Same as before) ---
    let fatherId = null;
    let motherId = null;
    let spouseId = null;
    
    let relativeMember = null;
    if (relativeToId) {
      const relResult = await db.query('SELECT * FROM family_members WHERE id = $1', [relativeToId]);
      if (relResult.rows.length > 0) {
        relativeMember = relResult.rows[0];
      }
    }

    if (relativeMember) {
      if (relationType === 'Brother' || relationType === 'Sister') {
        fatherId = relativeMember.father_id;
        motherId = relativeMember.mother_id;
      } else if (relationType === 'Child') {
        if (relativeMember.gender === 'female') {
          motherId = relativeMember.id;
          fatherId = relativeMember.spouse_id;
        } else {
          fatherId = relativeMember.id;
          motherId = relativeMember.spouse_id;
        }
      } else if (relationType === 'Spouse') {
        spouseId = relativeMember.id;
      }
    }

    // Insert the new member
    const insertResult = await db.query(
      `INSERT INTO family_members 
      (tree_owner_id, first_name, last_name, nickname, description, gender, father_id, mother_id, spouse_id, profile_img_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        tree_owner_id, 
        firstName, 
        lastName, 
        nickname, 
        description,
        gender || 'male',
        fatherId, 
        motherId, 
        spouseId, 
        profileImgUrl
      ]
    );

    const newMember = insertResult.rows[0];

    // Post-Insert Updates
    if (relativeMember) {
      if (relationType === 'Father') {
        await db.query('UPDATE family_members SET father_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      } else if (relationType === 'Mother') {
        await db.query('UPDATE family_members SET mother_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      } else if (relationType === 'Spouse') {
        await db.query('UPDATE family_members SET spouse_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      }
    }

    // 3. LOG THE ACTION
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: guestName,
      actorEmail: guestEmail,
      actorType: 'guest',
      shareLinkId: linkId,
      actionType: 'ADD_MEMBER',
      targetName: `${firstName} ${lastName}`,
      details: { relation: relationType, relativeTo: relativeMember ? relativeMember.first_name : 'None' }
    });

    res.status(201).json({ message: 'Member added via share link', member: newMember });

  } catch (err) {
    console.error('Error adding member via token:', err);
    res.status(500).json({ error: 'Server error adding member' });
  }
};

// Edit member via share token
exports.editMemberViaToken = async (req, res) => {
  try {
    const { token, memberId } = req.params;
    
    // 1. Verify Token
    const tokenResult = await db.query(
      'SELECT * FROM share_links WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid link' });
    }

    const linkData = tokenResult.rows[0];
    const { user_id: tree_owner_id, permission, id: linkId } = linkData;

    if (permission !== 'edit') {
      return res.status(403).json({ error: 'This link is read-only' });
    }

    // 2. Identify Guest
    const guestName = req.headers['x-guest-name'] || 'Unknown Guest';
    const guestEmail = req.headers['x-guest-email'] || 'No Email';

    // 3. Update Member
    const { firstName, lastName, nickname, description, birthDate, anniversaryDate, deathDate } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (firstName) { updates.push(`first_name = $${paramIndex++}`); values.push(firstName); }
    if (lastName) { updates.push(`last_name = $${paramIndex++}`); values.push(lastName); }
    if (nickname !== undefined) { updates.push(`nickname = $${paramIndex++}`); values.push(nickname); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (birthDate !== undefined) { updates.push(`birth_date = $${paramIndex++}`); values.push(birthDate || null); }
    if (anniversaryDate !== undefined) { updates.push(`anniversary_date = $${paramIndex++}`); values.push(anniversaryDate || null); }
    if (deathDate !== undefined) { updates.push(`death_date = $${paramIndex++}`); values.push(deathDate || null); }

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

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found or unauthorized.' });
    }

    const updatedMember = result.rows[0];

    // 4. LOG ACTION
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: guestName,
      actorEmail: guestEmail,
      actorType: 'guest',
      shareLinkId: linkId,
      actionType: 'EDIT_MEMBER',
      targetName: `${updatedMember.first_name} ${updatedMember.last_name}`,
      details: { updatedFields: Object.keys(req.body) }
    });

    res.json({ message: 'Member updated successfully', member: updatedMember });

  } catch (err) {
    console.error('Error editing member via token:', err);
    res.status(500).json({ error: 'Server error editing member' });
  }
};

// Delete member via share token
exports.deleteMemberViaToken = async (req, res) => {
  try {
    const { token, memberId } = req.params;
    console.log(`[Share Delete] Request: Token=${token}, MemberId=${memberId}`);
    
    // 1. Verify Token
    const tokenResult = await db.query(
      'SELECT * FROM share_links WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log('[Share Delete] Token not found');
      return res.status(404).json({ error: 'Invalid link' });
    }

    const linkData = tokenResult.rows[0];
    const { user_id: tree_owner_id, permission, id: linkId } = linkData;
    console.log(`[Share Delete] Token Valid. Owner=${tree_owner_id}, Permission=${permission}`);

    if (permission !== 'edit') {
      return res.status(403).json({ error: 'This link is read-only' });
    }

    // 2. Identify Guest
    const guestName = req.headers['x-guest-name'] || 'Unknown Guest';
    const guestEmail = req.headers['x-guest-email'] || 'No Email';

    // 3. Get Member Info (for Log) & Check Ownership
    const checkQuery = 'SELECT * FROM family_members WHERE id = $1 AND tree_owner_id = $2';
    const checkResult = await db.query(checkQuery, [memberId, tree_owner_id]);

    if (checkResult.rows.length === 0) {
      console.log(`[Share Delete] Member ${memberId} not found or does not belong to owner ${tree_owner_id}`);
      return res.status(404).json({ message: 'Member not found or unauthorized.' });
    }
    const memberToDelete = checkResult.rows[0];
    console.log(`[Share Delete] Deleting member: ${memberToDelete.first_name}`);

    // 4. Delete Logic (Cleanup relationships first)
    await db.query('UPDATE family_members SET father_id = NULL WHERE father_id = $1', [memberId]);
    await db.query('UPDATE family_members SET mother_id = NULL WHERE mother_id = $1', [memberId]);
    await db.query('UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1', [memberId]);

    await db.query('DELETE FROM family_members WHERE id = $1', [memberId]);

    // 5. LOG ACTION
    await auditController.logAction({
      treeOwnerId: tree_owner_id,
      actorName: guestName,
      actorEmail: guestEmail,
      actorType: 'guest',
      shareLinkId: linkId,
      actionType: 'DELETE_MEMBER',
      targetName: `${memberToDelete.first_name} ${memberToDelete.last_name}`,
      details: { memberId }
    });

    res.json({ message: 'Member deleted successfully' });

  } catch (err) {
    console.error('Error deleting member via token:', err);
    res.status(500).json({ error: 'Server error deleting member' });
  }
};

