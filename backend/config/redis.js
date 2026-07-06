const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  redisClient = createClient({
    url:      process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnect attempts');
          return new Error('Redis reconnect failed');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error',   (err) => console.error('Redis error:', err.message));

  await redisClient.connect();
  return redisClient;
};

const getRedis = () => redisClient;

module.exports = { connectRedis, getRedis };