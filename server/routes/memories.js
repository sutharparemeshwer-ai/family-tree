const express = require('express');
const multer = require('multer');
const path = require('path');
const memoriesController = require('../controllers/memoriesController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    console.log(`[Multer Memories] Saving file to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'memory-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// All memory routes are protected
router.use(authMiddleware);

// POST /api/memories - Create a new memory
router.post(
  '/',
  upload.array('files'), // Use .array() for multiple files, 'files' is the field name
  memoriesController.createMemory
);

// GET /api/memories?memberId=... - Get memories for a member
router.get('/', memoriesController.getMemoriesByMember);

// DELETE /api/memories/:id - Delete a memory
router.delete('/:id', memoriesController.deleteMemory);

// PATCH /api/memories/:id - Update a memory
router.patch('/:id', memoriesController.updateMemory);

module.exports = router;
