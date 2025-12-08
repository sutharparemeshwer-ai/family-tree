const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication invalid: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Get user details from database
    const db = require('../db');
    const client = await db.getClient();
    const userResult = await client.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1',
      [payload.userId]
    );
    client.release();

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Authentication invalid: User not found' });
    }

    const user = userResult.rows[0];
    // Attach the user info to the request object
    req.user = {
      userId: payload.userId,
      first_name: user.first_name,
      last_name: user.last_name
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication invalid: Token verification failed' });
  }
};

module.exports = authMiddleware;
