const db = require('../db');
const crypto = require('crypto');

// Generate a random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.generateShareLink = async (req, res) => {
  try {
    const userId = req.user.userId; // From authMiddleware
    const { permission } = req.body; // 'view' or 'edit'

    if (!['view', 'edit'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission type' });
    }

    const token = generateToken();

    // Store token in database
    const result = await db.query(
      'INSERT INTO share_tokens (token, tree_owner_id, permission) VALUES ($1, $2, $3) RETURNING *',
      [token, userId, permission]
    );

    res.json({ 
      message: 'Share link generated', 
      token: result.rows[0].token,
      permission: result.rows[0].permission 
    });

  } catch (err) {
    console.error('Error generating share link:', err);
    console.error('DB Error Code:', err.code);
    console.error('DB Error Message:', err.message);
    if (err.detail) console.error('DB Error Detail:', err.detail);
    res.status(500).json({ error: 'Server error generating link' });
  }
};

exports.getSharedTree = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const tokenResult = await db.query(
      'SELECT * FROM share_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    const { tree_owner_id, permission } = tokenResult.rows[0];

    // Fetch members for the owner of the tree
    const membersResult = await db.query(
      'SELECT * FROM family_members WHERE tree_owner_id = $1 ORDER BY id ASC',
      [tree_owner_id]
    );

    res.json({
      permission,
      ownerId: tree_owner_id,
      members: membersResult.rows
    });

  } catch (err) {
    console.error('Error fetching shared tree:', err);
    res.status(500).json({ error: 'Server error fetching tree' });
  }
};

// Add member via share token (for 'edit' permission)
exports.addMemberViaToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token and permission
    const tokenResult = await db.query(
      'SELECT * FROM share_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid link' });
    }

    const { tree_owner_id, permission } = tokenResult.rows[0];

    if (permission !== 'edit') {
      return res.status(403).json({ error: 'This link is read-only' });
    }

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

    // --- Relationship Logic ---
    let fatherId = null;
    let motherId = null;
    let spouseId = null;
    
    // We need to fetch the relative member if not adding 'Self' (which shouldn't happen here usually as tree exists)
    let relativeMember = null;
    if (relativeToId) {
      const relResult = await db.query('SELECT * FROM family_members WHERE id = $1', [relativeToId]);
      if (relResult.rows.length > 0) {
        relativeMember = relResult.rows[0];
      }
    }

    // Determine parents/spouse for the NEW member
    if (relativeMember) {
      if (relationType === 'Brother' || relationType === 'Sister') {
        fatherId = relativeMember.father_id;
        motherId = relativeMember.mother_id;
      } else if (relationType === 'Child') {
        // If relative is male, he is father. If female, she is mother.
        // Also try to find spouse of relative to set as other parent.
        if (relativeMember.gender === 'female') {
          motherId = relativeMember.id;
          fatherId = relativeMember.spouse_id; // Might be null
        } else {
          fatherId = relativeMember.id;
          motherId = relativeMember.spouse_id; // Might be null
        }
      } else if (relationType === 'Spouse') {
        spouseId = relativeMember.id;
      }
      // Note: If adding Father/Mother, the new member has unknown parents (usually).
      // But we need to update relativeMember AFTER insertion.
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
        gender || 'male', // Default if missing, though form sends it
        fatherId, 
        motherId, 
        spouseId, 
        profileImgUrl
      ]
    );

    const newMember = insertResult.rows[0];

    // --- Post-Insert Updates (Bi-directional links) ---
    if (relativeMember) {
      if (relationType === 'Father') {
        await db.query('UPDATE family_members SET father_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      } else if (relationType === 'Mother') {
        await db.query('UPDATE family_members SET mother_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      } else if (relationType === 'Spouse') {
        await db.query('UPDATE family_members SET spouse_id = $1 WHERE id = $2', [newMember.id, relativeMember.id]);
      }
    }

    res.status(201).json({ message: 'Member added via share link', member: newMember });

  } catch (err) {
    console.error('Error adding member via token:', err);
    res.status(500).json({ error: 'Server error adding member' });
  }
};
