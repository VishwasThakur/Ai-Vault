const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.error('Process uncaughtException:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Process unhandledRejection:', reason);
});

dotenv.config();

const { connectDB } = require('./config/db');

const app = express();

const fs = require('fs');

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/folders', require('./routes/folderRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/vault', require('./routes/criticalVaultRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the 10MB limit. Please choose a smaller file.',
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('Attempting to connect to MongoDB...');
  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`VaultAI Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use by another running process.`);
      process.exit(1);
    } else {
      console.error('Server error:', err.message);
    }
  });
};

startServer();

module.exports = app;
