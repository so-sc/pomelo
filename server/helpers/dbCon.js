const mongoose = require('mongoose');
const { runMigrations } = require('../migrations/runner');

let isCon = false;
const connectDB = async () => {
  if (isCon) {
    return;
  }
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`);
    await mongoose.connect(process.env.MONGODB_URI);
    isCon = true;
    console.log('Connected to MongoDB');

    // Run pending schema migrations
    await runMigrations();
  } catch (error) {
    console.error(`\nMongoDB Connection Error: ${error.message}\n`);
    process.exit(1);
  }
};

// readyState 1 === connected. Used by the /health endpoint and the container healthcheck.
const isConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isConnected };
