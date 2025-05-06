import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';
import { db } from '../db';
import { createRedisClient } from '../redis';

// Redis client for caching
const redisClient = createRedisClient();

// Context type definition
export interface Context {
  req: any; // Can be Express Request or NextRequest
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
export async function createContext(contextInput: any): Promise<Context> {
  try {
    // Безопасно получаем headers из разных форматов запросов
    const req = contextInput.req || contextInput.request || {};
    let headers;
    
    if (req.headers) {
      headers = req.headers;
    } else if (contextInput.headers) {
      headers = contextInput.headers;
    } else {
      headers = {};
    }
    
    // Безопасное получение токена авторизации
    let token = '';
    
    if (typeof headers.get === 'function') {
      // NextRequest headers
      token = headers.get('authorization') || '';
    } else if (headers.authorization) {
      // Express req headers
      token = headers.authorization;
    }
    
    token = token.replace('Bearer ', '').trim();
  
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
  } catch (error) {
    console.error('Error in context creation:', error);
    
    // Возвращаем базовый контекст, чтобы избежать падения сервера
    const pubsub = new PubSub();
    
    return {
      req: {},
      user: null,
      db,
      pubsub,
      redis: redisClient,
      cacheKey: (prefix: string, id?: string) => id ? `${prefix}:${id}` : prefix
    };
  }
}