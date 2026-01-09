const mongoose = require('mongoose');
let isCon = false;
const connectDB=async()=>{
  if (isCon) {
    console.log('Connection Exists');
    return;
  }
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    isCon=true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
};

module.exports={connectDB};
