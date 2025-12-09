const db = require('../db');
const fs = require('fs').promises; // For file system operations
const path = require('path'); // For path manipulation

const createMemory = async (req, res) => {
  const { title, description, memberId } = req.body;
  const tree_owner_id = req.user.userId;
  const files = req.files; // Array of files from multer

  if (!title || !memberId) {
    return res.status(400).json({ message: 'Title and memberId are required.' });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'At least one photo or video is required.' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Step 1: Insert the new memory
    const memoryQuery = `
      INSERT INTO memories(tree_owner_id, member_id, title, description)
      VALUES($1, $2, $3, $4)
      RETURNING id;
    `;
    const memoryResult = await client.query(memoryQuery, [
      tree_owner_id,
      memberId,
      title,
      description,
    ]);
    const newMemoryId = memoryResult.rows[0].id;

    // Step 2: Insert file records into memory_files
    const fileInsertPromises = files.map(file => {
      const fileUrl = `/uploads/${file.filename}`;
      const fileType = file.mimetype.startsWith('image') ? 'image' : 'video';
      const fileQuery = `
        INSERT INTO memory_files(memory_id, file_url, file_type)
        VALUES($1, $2, $3);
      `;
      return client.query(fileQuery, [newMemoryId, fileUrl, fileType]);
    });

    await Promise.all(fileInsertPromises);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Memory created successfully!', memoryId: newMemoryId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating memory:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

const getMemoriesByMember = async (req, res) => {
  const { memberId } = req.query;
  const tree_owner_id = req.user.userId;

  if (!memberId) {
    return res.status(400).json({ message: 'memberId query parameter is required.' });
  }

  try {
    // Fetch memories and their associated files
    const query = `
      SELECT
        m.id,
        m.title,
        m.description,
        m.created_at,
        COALESCE(
          (
            SELECT json_agg(json_build_object('url', mf.file_url, 'type', mf.file_type))
            FROM memory_files mf
            WHERE mf.memory_id = m.id
          ),
          '[]'::json
        ) AS files
      FROM memories m
      WHERE m.tree_owner_id = $1 AND m.member_id = $2
      ORDER BY m.created_at DESC;
    `;
    const result = await db.query(query, [tree_owner_id, memberId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMemory = async (req, res) => {
  const { id } = req.params; // Memory ID
  const tree_owner_id = req.user.userId; // From authMiddleware

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify memory exists and belongs to the user
    const memoryResult = await client.query(
      'SELECT * FROM memories WHERE id = $1 AND tree_owner_id = $2',
      [id, tree_owner_id]
    );

    if (memoryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Memory not found or unauthorized.' });
    }

    // 2. Get associated file paths
    const filesResult = await client.query(
      'SELECT file_url FROM memory_files WHERE memory_id = $1',
      [id]
    );
    const fileUrls = filesResult.rows.map(row => row.file_url);

    // 3. Delete files from file system
    const uploadDir = path.join(__dirname, '..', 'uploads'); // Path to server/uploads
    for (const fileUrl of fileUrls) {
      const filePath = path.join(uploadDir, path.basename(fileUrl));
      try {
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (fileError) {
        // Log error but don't stop deletion if file not found on disk
        console.warn(`Could not delete file ${filePath}: ${fileError.message}`);
      }
    }

    // 4. Delete from memories table (this will cascade delete from memory_files)
    await client.query('DELETE FROM memories WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Memory deleted successfully.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting memory:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

const updateMemory = async (req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};


module.exports = {
  createMemory,
  getMemoriesByMember,
  deleteMemory,
  updateMemory,
};
