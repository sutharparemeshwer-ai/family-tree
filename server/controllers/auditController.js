const db = require('../db');

// Helper function to log an activity
// This is used internally by other controllers
const logAction = async ({
  treeOwnerId,
  actorName,
  actorEmail,
  actorType, // 'owner' or 'guest'
  shareLinkId = null,
  actionType, // 'ADD_MEMBER', 'EDIT_MEMBER', 'DELETE_MEMBER'
  targetName,
  details = null
}) => {
  try {
    const query = `
      INSERT INTO audit_logs 
      (tree_owner_id, actor_name, actor_email, actor_type, share_link_id, action_type, target_name, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await db.query(query, [
      treeOwnerId,
      actorName,
      actorEmail,
      actorType,
      shareLinkId,
      actionType,
      targetName,
      details
    ]);
    
    console.log(`[Audit] Logged action: ${actionType} by ${actorName}`);
  } catch (err) {
    console.error('[Audit] Failed to log action:', err);
    // We don't throw here to avoid breaking the main operation if logging fails
  }
};

// API Endpoint to fetch logs for the tree owner
const getLogs = async (req, res) => {
  try {
    const treeOwnerId = req.user.userId;
    
    const query = `
      SELECT * FROM audit_logs 
      WHERE tree_owner_id = $1 
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    
    const result = await db.query(query, [treeOwnerId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

module.exports = {
  logAction,
  getLogs
};
