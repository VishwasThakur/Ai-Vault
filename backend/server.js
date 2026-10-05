const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.error('Process uncaughtException:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Process unhandledRejection:', reason);
});

dotenv.config();

const { connectDB, getDbStatus } = require('./config/db');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://ai-vault-sandy.vercel.app',
  /\.vercel\.app$/,
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim());
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  const dbInfo = getDbStatus();
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbInfo,
    envCheck: {
      MONGODB_URI: Boolean(process.env.MONGODB_URI),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h (default)',
      CRITICAL_VAULT_EXPIRES_IN: process.env.CRITICAL_VAULT_EXPIRES_IN || '15m (default)',
      CLOUDINARY_CONFIGURED: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
      GEMINI_API_KEYS_SET: Boolean(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY),
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite (default)',
    },
  });
});

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
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'VaultAI Express API is live and healthy',
      health: '/api/health',
    });
  });
}

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: origin not allowed by CORS policy',
    });
  }

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
