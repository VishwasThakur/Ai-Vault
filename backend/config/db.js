const mongoose = require('mongoose');

let mongodInstance = null;

mongoose.connection.on('error', (err) => {
  console.warn('Mongoose connection warning:', err.message);
});

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri && (uri.startsWith('mongodb+srv://') || uri.includes('@'))) {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB Atlas successfully.');
      return;
    }

    if (uri && uri.startsWith('mongodb://') && !uri.includes('@')) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log('Connected to local MongoDB instance.');
        return;
      } catch (localErr) {
        console.log('Local MongoDB not running. Initializing embedded in-memory MongoDB...');
      }
    }

    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memUri = mongodInstance.getUri();
    await mongoose.connect(memUri);
    console.log('Connected to embedded in-memory MongoDB.');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
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
