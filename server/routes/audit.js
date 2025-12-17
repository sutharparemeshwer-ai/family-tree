const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');

// Get audit logs for the logged-in user
router.get('/', authMiddleware, auditController.getLogs);

module.exports = router;
