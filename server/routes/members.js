                                                                                                                                                                                                                                                      const express = require('express');
const multer = require('multer');
const path = require('path');
const membersController = require('../controllers/membersController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();                                                                                                                                   


// Using the same multer storage configuration as auth routes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    console.log(`[Multer Members] Saving file to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST /api/members
// This route is protected and handles file uploads
router.post(
  '/', 
  authMiddleware, 
  upload.single('profileImage'), // 'profileImage' must match the name attribute in the FormData
  membersController.createMember
);

// GET /api/members
// This route is protected and fetches all family members for the logged-in user
router.get('/', authMiddleware, membersController.getMembers);

// GET /api/members/events
// Fetch upcoming birthdays and anniversaries
router.get('/events', authMiddleware, membersController.getUpcomingEvents);

// PUT /api/members/:id
// Update a family member
router.put(
  '/:id',
  authMiddleware,
  upload.single('profileImage'),
  membersController.updateMember
);

// DELETE /api/members/:id
// Delete a family member
router.delete('/:id', authMiddleware, membersController.deleteMember);

module.exports = router;
