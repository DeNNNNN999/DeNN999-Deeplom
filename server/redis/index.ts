import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Redis client
export function createRedisClient() {
  const client = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });
  
  // Handle connection events
  client.on('error', (err) => console.error('Redis client error:', err));
  client.on('connect', () => console.log('Connected to Redis'));
  client.on('ready', () => console.log('Redis client ready'));
  client.on('end', () => console.log('Redis connection ended'));
  
  // Connect to Redis
  client.connect().catch(err => {
    console.error('Failed to connect to Redis:', err);
    // Allow application to run without Redis in development
    if (process.env.NODE_ENV !== 'development') {
      console.error('Redis connection is required in production. Exiting...');
      process.exit(1);
    }
  });
  
  return client;
}

// Set data in Redis cache with expiration
export async function setCacheData(
  client: ReturnType<typeof createRedisClient>,
  key: string,
  data: any,
  expireSeconds = 3600
) {
  try {
    const serializedData = JSON.stringify(data);
    await client.set(key, serializedData, { EX: expireSeconds });
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
}

// Get data from Redis cache
export async function getCacheData(
  client: ReturnType<typeof createRedisClient>,
  key: string
) {
  try {
    const cachedData = await client.get(key);
    if (!cachedData) return null;
    return JSON.parse(cachedData);
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

// Invalidate specific cache
export async function invalidateCache(
  client: ReturnType<typeof createRedisClient>,
  key: string
) {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error invalidating cache for key ${key}:`, error);
    return false;
  }
}

// Invalidate cache by pattern
export async function invalidateCacheByPattern(
  client: ReturnType<typeof createRedisClient>,
  pattern: string
) {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error(`Error invalidating cache for pattern ${pattern}:`, error);
    return false;
  }
}