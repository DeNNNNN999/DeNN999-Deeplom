import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';
import { db } from '../db';
import { createRedisClient } from '../redis';

// Redis client for caching
const redisClient = createRedisClient();

// Context type definition
export interface Context {
  req: Request;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  db: typeof db;
  pubsub: PubSub;
  redis: typeof redisClient;
  cacheKey: (prefix: string, id?: string) => string;
}

// Create GraphQL context
export async function createContext({ req }: { req: Request }): Promise<Context> {
  // Extract token from authorization header
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  
  // Verify and decode JWT
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        role: string;
      };
    } catch (err) {
      console.error('Invalid token:', err);
    }
  }
  
  // Create PubSub instance for subscriptions
  const pubsub = new PubSub();
  
  // Helper function to create consistent cache keys
  const cacheKey = (prefix: string, id?: string) => {
    return id ? `${prefix}:${id}` : prefix;
  };
  
  return { 
    req,
    user,
    db,
    pubsub,
    redis: redisClient,
    cacheKey
  };
}