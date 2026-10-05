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

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim()) {
    try {
      console.log('Connecting to MongoDB via MONGODB_URI...');
      await mongoose.connect(uri.trim(), { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB database successfully.');
      return;
    } catch (error) {
      console.error('MongoDB Connection Error with provided MONGODB_URI:', error.message);
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Production MongoDB connection failed. Please verify MONGODB_URI in Render dashboard.');
        return;
      }
      console.log('Local/Dev: Falling back to embedded in-memory database...');
    }
  } else {
    console.warn('MONGODB_URI is not set in environment.');
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
  } catch (error) {
    console.error('Failed to initialize embedded in-memory MongoDB:', error.message);
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

module.exports = { connectDB, disconnectDB };
