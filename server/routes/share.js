const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- Protected Routes (Require Owner Login) ---
router.post('/generate', authMiddleware, shareController.generateShareLink);
router.get('/links', authMiddleware, shareController.getLinks);
router.delete('/links/:id', authMiddleware, shareController.deleteLink);

// --- Public / Guest Routes ---
router.get('/verify/:token', shareController.verifyLink);
router.get('/:token', shareController.getSharedTree);

// Add member via token (Protected by token permission + Auditing)
router.post('/:token/members', upload.single('profileImage'), shareController.addMemberViaToken);

// Edit member via token
router.put('/:token/members/:memberId', upload.single('profileImage'), shareController.editMemberViaToken);

// Delete member via token
router.delete('/:token/members/:memberId', shareController.deleteMemberViaToken);

module.exports = router;