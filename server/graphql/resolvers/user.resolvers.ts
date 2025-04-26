import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, like, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { users } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';

export const userResolvers = {
  Query: {
    // Get the current authenticated user
    currentUser: async (_: any, __: any, { user, db }: Context) => {
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      const result = await db.select().from(users).where(eq(users.id, user.id));
      
      if (!result.length) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      return result[0];
    },
    
    // Get a user by ID
    user: async (_: any, { id }: { id: string }, { user, db }: Context) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'View user details');
      
      const result = await db.select().from(users).where(eq(users.id, id));
      
      if (!result.length) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      return result[0];
    },
    
    // Get paginated users with optional search
    users: async (
      _: any, 
      { pagination, search }: { pagination: { page: number; limit: number }; search?: string }, 
      { user, db }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'View users list');
      
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;
      
      // Build query with optional search
      let query = db.select().from(users);
      
      if (search) {
        query = query.where(
          sql`(${users.firstName} ILIKE ${'%' + search + '%'} OR 
               ${users.lastName} ILIKE ${'%' + search + '%'} OR 
               ${users.email} ILIKE ${'%' + search + '%'})`
        );
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: sql`COUNT(*)` }).from(users);
      const total = Number(countResult[0].count);
      
      // Execute paginated query
      const result = await query.limit(limit).offset(offset);
      
      return {
        items: result,
        total,
        page,
        limit,
        hasMore: offset + result.length < total,
      };
    },
  },
  
  Mutation: {
    // Register a new user
    register: async (
      _: any, 
      { input }: { input: { email: string; password: string; firstName: string; lastName: string; role: string; department?: string } }, 
      { db, req }: Context
    ) => {
      const { email, password, firstName, lastName, role, department } = input;
      
      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      
      if (existingUser.length) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await db.insert(users).values({
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as any,
        department,
        lastLogin: new Date(),
      }).returning();
      
      const newUser = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: newUser.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: newUser.id,
          newValues: { ...newUser, passwordHash: '[REDACTED]' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Generate JWT token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      return { token, user: newUser };
    },
    
    // Login user
    login: async (
      _: any, 
      { input }: { input: { email: string; password: string } }, 
      { db, req }: Context
    ) => {
      const { email, password } = input;
      
      // Find user by email
      const result = await db.select().from(users).where(eq(users.email, email));
      
      if (!result.length) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      const user = result[0];
      
      // Check if user is active
      if (!user.isActive) {
        throw new GraphQLError('User account is disabled', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!validPassword) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Update last login
      await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'LOGIN',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      return { token, user };
    },
    
    // Create a new user (admin only)
    createUser: async (
      _: any, 
      { input }: { input: { email: string; password: string; firstName: string; lastName: string; role: string; department?: string } }, 
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'Create users');
      
      const { email, password, firstName, lastName, role, department } = input;
      
      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      
      if (existingUser.length) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await db.insert(users).values({
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as any,
        department,
      }).returning();
      
      const newUser = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: newUser.id,
          newValues: { ...newUser, passwordHash: '[REDACTED]' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      return newUser;
    },
    
    // Update a user
    updateUser: async (
      _: any, 
      { id, input }: { id: string; input: { email?: string; firstName?: string; lastName?: string; role?: string; department?: string; isActive?: boolean } }, 
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Allow users to update their own profile, but only admins can update other users
      if (id !== user.id) {
        checkPermission(user.role, ['ADMIN'], 'Update other users');
      }
      
      // Get current user data for audit log
      const currentUserData = await db.select().from(users).where(eq(users.id, id));
      
      if (!currentUserData.length) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Check if email is being updated and if it already exists
      if (input.email && input.email !== currentUserData[0].email) {
        const existingUser = await db.select().from(users).where(eq(users.email, input.email));
        
        if (existingUser.length) {
          throw new GraphQLError('Email already in use', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }
      
      // Update user
      const result = await db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      const updatedUser = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'USER',
          entityId: id,
          oldValues: currentUserData[0],
          newValues: updatedUser,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      return updatedUser;
    },
    
    // Delete a user
    deleteUser: async (_: any, { id }: { id: string }, { user, db, req }: Context) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'Delete users');
      
      // Get current user data for audit log
      const userData = await db.select().from(users).where(eq(users.id, id));
      
      if (!userData.length) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Prevent deletion of own account
      if (id === user.id) {
        throw new GraphQLError('Cannot delete your own account', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Delete user
      await db.delete(users).where(eq(users.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'USER',
          entityId: id,
          oldValues: userData[0],
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      return true;
    },
  },
};