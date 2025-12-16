const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer setup (reusing for consistency)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    console.log(`[Multer Share] Saving file to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Protected route to generate a link
router.post('/generate', authMiddleware, shareController.generateShareLink);

// Public route to view tree via token
router.get('/:token', shareController.getSharedTree);

// Public route (but protected by token logic) to add member
// Note: 'profileImage' field name must match frontend
router.post('/:token/members', upload.single('profileImage'), shareController.addMemberViaToken);

module.exports = router;
