const mongoose = require('mongoose');

let mongodInstance = null;

mongoose.connection.on('error', (err) => {
  console.warn('Mongoose connection warning:', err.message);
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

let dbStatus = {
  connected: false,
  message: 'Initializing...',
  error: null,
};

const getDbStatus = () => {
  return {
    connected: mongoose.connection.readyState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    uriProvided: Boolean(process.env.MONGODB_URI),
    uriType: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.startsWith('mongodb+srv://')
        ? 'Atlas (mongodb+srv)'
        : 'Standard (mongodb://)'
      : 'None',
    message: dbStatus.message,
    error: dbStatus.error,
  };
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim()) {
    try {
      console.log('Connecting to MongoDB via MONGODB_URI...');
      await mongoose.connect(uri.trim(), { serverSelectionTimeoutMS: 8000 });
      console.log('Connected to MongoDB database successfully.');
      dbStatus = { connected: true, message: 'Connected to MongoDB via MONGODB_URI', error: null };
      return;
    } catch (error) {
      console.error('MongoDB Connection Error with provided MONGODB_URI:', error.message);
      dbStatus = {
        connected: false,
        message: 'Failed to connect using provided MONGODB_URI',
        error: error.message,
      };
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Production MongoDB connection failed. Please verify MONGODB_URI in Render dashboard.');
        return;
      }
      console.log('Local/Dev: Falling back to embedded in-memory database...');
    }
  } else {
    console.warn('MONGODB_URI is not set in environment.');
    dbStatus = {
      connected: false,
      message: 'MONGODB_URI environment variable is not set',
      error: 'Missing MONGODB_URI',
    };
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: MONGODB_URI is missing in production environment variables.');
      return;
    }
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memUri = mongodInstance.getUri();
    await mongoose.connect(memUri);
    console.log('Connected to embedded in-memory MongoDB.');
    dbStatus = { connected: true, message: 'Connected to embedded in-memory MongoDB', error: null };
  } catch (error) {
    console.error('Failed to initialize embedded in-memory MongoDB:', error.message);
    dbStatus = { connected: false, message: 'Failed to initialize in-memory DB', error: error.message };
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch (err) {}
};

process.on('exit', () => {
  if (mongodInstance) {
    try {
      mongodInstance.stop();
    } catch (e) {}
  }
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = { connectDB, disconnectDB, getDbStatus };
