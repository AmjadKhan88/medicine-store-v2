const mongoose = require('mongoose');

const connectDB = async () => {
  const options = {
    // Connection pool — 1000 stores × avg 2 queries each
    maxPoolSize:     100,   // max connections in pool
    minPoolSize:     10,    // keep 10 alive always
    socketTimeoutMS: 45000, // kill idle sockets after 45s
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS:     10000,

    // Compression
    compressors: ['zlib'],

    // Write concern — don't wait for disk, just memory ack
    w:        'majority',
    wtimeout: 5000,
  };

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`✅ Pool size: ${options.maxPoolSize}`);

    // Connection events
    mongoose.connection.on('disconnected', () => {
      console.error('❌ MongoDB disconnected — attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err);
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;