const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members'); // Import members route
const memoryRoutes = require('./routes/memories');
const userRoutes = require('./routes/users');
const shareRoutes = require('./routes/share');
const socialRoutes = require('./routes/social'); // NEW

const app = express();
const port = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
    console.log('Created uploads directory at:', uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes); // Use members route
app.use('/api/memories', memoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/social', socialRoutes); // NEW

// Basic Route
app.get('/', (req, res) => {
  res.send('Family Tree Server is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
