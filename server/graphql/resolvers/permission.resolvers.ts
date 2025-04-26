import { eq, and, sql, desc, asc, or } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { permissions, users } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission } from '../../utils/permissions';
import { Context } from '../context';
import { invalidateCacheByPattern } from '../../redis';

export const permissionResolvers = {
  Query: {
    // Get a permission by ID
    permission: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'view permissions');
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('permission', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get from database
      const result = await db.select().from(permissions).where(eq(permissions.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Permission not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result[0]), { EX: 3600 });
      
      return result[0];
    },
    
    // Get paginated permissions with optional filtering
    permissions: async (
      _: any,
      {
        pagination,
        role,
        resource,
        action,
      }: {
        pagination: { page: number; limit: number };
        role?: string;
        resource?: string;
        action?: string;
      },
      { user, db, redis, cacheKey }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'view permissions');
      
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;
      
      // Generate cache key based on query parameters
      const cacheKeyName = cacheKey(
        `permissions:${page}:${limit}:${role || ''}:${resource || ''}:${action || ''}`
      );
      
      // Try to get from cache first
      const cachedData = await redis.get(cacheKeyName);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build query with filters
      let query = db.select().from(permissions);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(permissions);
      
      // Apply filters
      const conditions = [];
      
      if (role) {
        conditions.push(eq(permissions.role, role as any));
      }
      
      if (resource) {
        conditions.push(eq(permissions.resource, resource));
      }
      
      if (action) {
        conditions.push(eq(permissions.action, action));
      }
      
      // Apply conditions to both queries
      if (conditions.length > 0) {
        const whereCondition = and(...conditions);
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      
      // Execute paginated query with sorting
      const result = await query
        .orderBy(permissions.role, permissions.resource, permissions.action)
        .limit(limit)
        .offset(offset);
      
      const response = {
        items: result,
        total,
        page,
        limit,
        hasMore: offset + result.length < total,
      };
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(response), { EX: 300 }); // Cache for 5 minutes
      
      return response;
    },
    
    // Get a map of all permissions for a specific role
    rolePermissionsMap: async (
      _: any,
      { role }: { role: string },
      { user, db, redis, cacheKey }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins and users with the same role can access role permissions map
      if (user.role !== 'ADMIN' && user.role !== role) {
        throw new GraphQLError('Permission denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey(`rolePermissionsMap:${role}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get all permissions for the role
      const result = await db
        .select()
        .from(permissions)
        .where(eq(permissions.role, role as any));
      
      // Create a map of permissions by resource and action
      const permissionsMap: Record<string, Record<string, boolean>> = {};
      
      for (const perm of result) {
        if (!permissionsMap[perm.resource]) {
          permissionsMap[perm.resource] = {};
        }
        
        permissionsMap[perm.resource][perm.action] = perm.isGranted;
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(permissionsMap), { EX: 600 }); // Cache for 10 minutes
      
      return permissionsMap;
    },
  },
  
  Mutation: {
    // Create a new permission
    createPermission: async (
      _: any,
      { input }: { input: { role: string; resource: string; action: string; description?: string; isGranted: boolean } },
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'create permissions');
      
      const { role, resource, action, description, isGranted } = input;
      
      // Check if permission already exists
      const existingPerm = await db
        .select()
        .from(permissions)
        .where(
          and(
            eq(permissions.role, role as any),
            eq(permissions.resource, resource),
            eq(permissions.action, action)
          )
        );
      
      if (existingPerm.length) {
        throw new GraphQLError('This permission already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Create permission
      const result = await db.insert(permissions).values({
        role: role as any,
        resource,
        action,
        description,
        isGranted,
      }).returning();
      
      const newPermission = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'PERMISSION',
          entityId: newPermission.id,
          newValues: newPermission,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'permissions:*');
      await invalidateCacheByPattern(redis, `rolePermissionsMap:${role}`);
      
      return newPermission;
    },
    
    // Update a permission
    updatePermission: async (
      _: any,
      { id, input }: { id: string; input: { isGranted: boolean; description?: string } },
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'update permissions');
      
      // Get current permission data
      const currentPermissionResult = await db.select().from(permissions).where(eq(permissions.id, id));
      
      if (!currentPermissionResult.length) {
        throw new GraphQLError('Permission not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentPermission = currentPermissionResult[0];
      
      // Update permission
      const result = await db.update(permissions)
        .set({
          isGranted: input.isGranted,
          description: input.description,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, id))
        .returning();
      
      const updatedPermission = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'PERMISSION',
          entityId: id,
          oldValues: currentPermission,
          newValues: updatedPermission,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`permission:${id}`);
      await invalidateCacheByPattern(redis, 'permissions:*');
      await invalidateCacheByPattern(redis, `rolePermissionsMap:${updatedPermission.role}`);
      
      return updatedPermission;
    },
    
    // Delete a permission
    deletePermission: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'delete permissions');
      
      // Get current permission data
      const permissionData = await db.select().from(permissions).where(eq(permissions.id, id));
      
      if (!permissionData.length) {
        throw new GraphQLError('Permission not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const permission = permissionData[0];
      
      // Delete permission
      await db.delete(permissions).where(eq(permissions.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'PERMISSION',
          entityId: id,
          oldValues: permission,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`permission:${id}`);
      await invalidateCacheByPattern(redis, 'permissions:*');
      await invalidateCacheByPattern(redis, `rolePermissionsMap:${permission.role}`);
      
      return true;
    },
    
    // Batch update role permissions
    updateRolePermissions: async (
      _: any,
      { role, permissions: permissionsInput }: { role: string; permissions: any[] },
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'update role permissions');
      
      try {
        // Get all current permissions for the role
        const currentPermissions = await db
          .select()
          .from(permissions)
          .where(eq(permissions.role, role as any));
        
        // Create a map of current permissions by resource and action
        const currentPermMap = new Map();
        
        for (const perm of currentPermissions) {
          const key = `${perm.resource}:${perm.action}`;
          currentPermMap.set(key, perm);
        }
        
        // Process each permission in the input
        for (const permInput of permissionsInput) {
          const { resource, action, description, isGranted } = permInput;
          const key = `${resource}:${action}`;
          
          if (currentPermMap.has(key)) {
            // Update existing permission
            const existingPerm = currentPermMap.get(key);
            
            if (existingPerm.isGranted !== isGranted || existingPerm.description !== description) {
              await db.update(permissions)
                .set({
                  isGranted,
                  description,
                  updatedAt: new Date(),
                })
                .where(eq(permissions.id, existingPerm.id));
              
              // Log the update
              await createAuditLog(
                db,
                {
                  userId: user.id,
                  action: 'UPDATE',
                  entityType: 'PERMISSION',
                  entityId: existingPerm.id,
                  oldValues: existingPerm,
                  newValues: { ...existingPerm, isGranted, description },
                  ipAddress: req.ip,
                  userAgent: req.headers['user-agent'],
                }
              );
            }
          } else {
            // Create new permission
            const result = await db.insert(permissions).values({
              role: role as any,
              resource,
              action,
              description,
              isGranted,
            }).returning();
            
            const newPermission = result[0];
            
            // Log the creation
            await createAuditLog(
              db,
              {
                userId: user.id,
                action: 'CREATE',
                entityType: 'PERMISSION',
                entityId: newPermission.id,
                newValues: newPermission,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
              }
            );
          }
        }
        
        // Invalidate cache
        await invalidateCacheByPattern(redis, 'permissions:*');
        await invalidateCacheByPattern(redis, `rolePermissionsMap:${role}`);
        
        return true;
      } catch (error) {
        console.error('Error updating role permissions:', error);
        throw new GraphQLError('Failed to update role permissions', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};