import { eq, like, sql, and, or } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { systemSettings, users } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission } from '../../utils/permissions';
import { Context } from '../context';
import { invalidateCacheByPattern } from '../../redis';

export const systemSettingResolvers = {
  Query: {
    // Get a system setting by ID or key
    systemSetting: async (
      _: any, 
      { id, key }: { id?: string; key?: string }, 
      { user, db, redis, cacheKey }: Context
    ) => {
      // Users need to be authenticated to access settings
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Generate cache key
      const cacheKeyName = id ? cacheKey('systemSetting:id', id) : cacheKey('systemSetting:key', key);
      
      // Try to get from cache first
      const cachedData = await redis.get(cacheKeyName);
      if (cachedData) {
        const setting = JSON.parse(cachedData);
        
        // Non-admin users can only access public settings
        if (user.role !== 'ADMIN' && !setting.isPublic) {
          throw new GraphQLError('Permission denied', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        
        return setting;
      }
      
      // Build query based on provided parameters
      let query = db.select().from(systemSettings);
      
      if (id) {
        query = query.where(eq(systemSettings.id, id));
      } else if (key) {
        query = query.where(eq(systemSettings.key, key));
      } else {
        throw new GraphQLError('Either id or key must be provided', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Execute query
      const result = await query;
      
      if (!result.length) {
        throw new GraphQLError('System setting not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const setting = result[0];
      
      // Non-admin users can only access public settings
      if (user.role !== 'ADMIN' && !setting.isPublic) {
        throw new GraphQLError('Permission denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(setting), { EX: 3600 });
      
      return setting;
    },
    
    // Get paginated system settings with optional search
    systemSettings: async (
      _: any,
      { pagination, search, publicOnly }: { pagination: { page: number; limit: number }; search?: string; publicOnly?: boolean },
      { user, db, redis, cacheKey }: Context
    ) => {
      // Users need to be authenticated to access settings
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Non-admin users can only see public settings
      if (user.role !== 'ADMIN') {
        publicOnly = true;
      }
      
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;
      
      // Generate cache key based on query parameters
      const cacheKeyName = cacheKey(`systemSettings:${page}:${limit}:${search || ''}:${publicOnly || false}`);
      
      // Try to get from cache first
      const cachedData = await redis.get(cacheKeyName);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build query with optional search and public filter
      let query = db.select().from(systemSettings);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(systemSettings);
      
      // Apply filters
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(systemSettings.key, `%${search}%`),
            like(systemSettings.value, `%${search}%`),
            like(systemSettings.description, `%${search}%`)
          )
        );
      }
      
      if (publicOnly) {
        conditions.push(eq(systemSettings.isPublic, true));
      }
      
      // Apply the conditions to the queries
      if (conditions.length > 0) {
        const whereCondition = and(...conditions);
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      
      // Execute paginated query
      const result = await query
        .orderBy(systemSettings.key)
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
  },
  
  Mutation: {
    // Create a new system setting
    createSystemSetting: async (
      _: any,
      { input }: { input: { key: string; value: string; description?: string; dataType?: string; isPublic?: boolean } },
      { user, db, pubsub, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'create system settings');
      
      const { key, value, description, dataType = 'string', isPublic = false } = input;
      
      // Check if setting with this key already exists
      const existingSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      
      if (existingSetting.length) {
        throw new GraphQLError('A setting with this key already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Create setting
      const result = await db.insert(systemSettings).values({
        key,
        value,
        description,
        dataType,
        isPublic,
        updatedById: user.id,
      }).returning();
      
      const newSetting = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'SYSTEM_SETTING',
          entityId: newSetting.id,
          newValues: newSetting,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Publish subscription event
      pubsub.publish('SYSTEM_SETTING_UPDATED', {
        systemSettingUpdated: newSetting,
      });
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'systemSettings:*');
      await invalidateCacheByPattern(redis, `systemSetting:key:${key}`);
      
      return newSetting;
    },
    
    // Update a system setting
    updateSystemSetting: async (
      _: any,
      { id, input }: { id: string; input: { value: string; description?: string; dataType?: string; isPublic?: boolean } },
      { user, db, pubsub, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'update system settings');
      
      // Get current setting data
      const currentSettingResult = await db.select().from(systemSettings).where(eq(systemSettings.id, id));
      
      if (!currentSettingResult.length) {
        throw new GraphQLError('System setting not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentSetting = currentSettingResult[0];
      
      // Update setting
      const result = await db.update(systemSettings)
        .set({
          ...input,
          updatedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.id, id))
        .returning();
      
      const updatedSetting = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'SYSTEM_SETTING',
          entityId: id,
          oldValues: currentSetting,
          newValues: updatedSetting,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Publish subscription event
      pubsub.publish('SYSTEM_SETTING_UPDATED', {
        systemSettingUpdated: updatedSetting,
      });
      
      // Invalidate cache
      await redis.del(`systemSetting:id:${id}`);
      await redis.del(`systemSetting:key:${updatedSetting.key}`);
      await invalidateCacheByPattern(redis, 'systemSettings:*');
      
      return updatedSetting;
    },
    
    // Delete a system setting
    deleteSystemSetting: async (
      _: any,
      { id }: { id: string },
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'delete system settings');
      
      // Get current setting data
      const settingData = await db.select().from(systemSettings).where(eq(systemSettings.id, id));
      
      if (!settingData.length) {
        throw new GraphQLError('System setting not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const setting = settingData[0];
      
      // Delete setting
      await db.delete(systemSettings).where(eq(systemSettings.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'SYSTEM_SETTING',
          entityId: id,
          oldValues: setting,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`systemSetting:id:${id}`);
      await redis.del(`systemSetting:key:${setting.key}`);
      await invalidateCacheByPattern(redis, 'systemSettings:*');
      
      return true;
    },
    
    // Initialize system with default settings
    initializeSystem: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'initialize system');
      
      try {
        // Default system settings
        const defaultSettings = [
          {
            key: 'company_name',
            value: 'Supplier Management System',
            description: 'Company name displayed in the UI',
            dataType: 'string',
            isPublic: true,
          },
          {
            key: 'currency_default',
            value: 'USD',
            description: 'Default currency for financial transactions',
            dataType: 'string',
            isPublic: true,
          },
          {
            key: 'contract_expiry_days',
            value: '30',
            description: 'Days before contract expiry to send notifications',
            dataType: 'number',
            isPublic: false,
          },
          {
            key: 'password_min_length',
            value: '8',
            description: 'Minimum password length for new users',
            dataType: 'number',
            isPublic: false,
          },
          {
            key: 'session_timeout_minutes',
            value: '60',
            description: 'User session timeout in minutes',
            dataType: 'number',
            isPublic: false,
          },
          {
            key: 'enable_two_factor_auth',
            value: 'false',
            description: 'Enable two-factor authentication for users',
            dataType: 'boolean',
            isPublic: false,
          },
        ];
        
        for (const setting of defaultSettings) {
          // Check if setting already exists
          const existingSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, setting.key));
          
          if (!existingSetting.length) {
            await db.insert(systemSettings).values({
              ...setting,
              updatedById: user.id,
            });
          }
        }
        
        // Initialize default permissions
        await initializeDefaultPermissions(db, user.id);
        
        return true;
      } catch (error) {
        console.error('Error initializing system:', error);
        return false;
      }
    },
  },
  
  Subscription: {
    // Subscribe to system setting updates
    systemSettingUpdated: {
      subscribe: (_: any, __: any, { pubsub, user }: Context) => {
        // Check if user is authenticated
        if (!user) {
          throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }
        
        // Only admins should be able to subscribe to system setting updates
        if (user.role !== 'ADMIN') {
          throw new GraphQLError('Permission denied', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        
        return pubsub.asyncIterator(['SYSTEM_SETTING_UPDATED']);
      },
    },
  },
  
  // Field resolvers
  SystemSetting: {
    // Resolve updatedBy field
    updatedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.updatedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.updatedById));
      return result.length ? result[0] : null;
    },
  },
};

// Helper function to initialize default permissions
async function initializeDefaultPermissions(db: any, userId: string) {
  // Definition of default role permissions
  const defaultPermissions = [
    // Admin permissions
    { role: 'ADMIN', resource: 'USER', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'USER', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'USER', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'USER', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'SYSTEM_SETTING', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'SYSTEM_SETTING', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'SYSTEM_SETTING', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'SYSTEM_SETTING', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'AUDIT_LOG', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'PERMISSION', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'PERMISSION', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'PERMISSION', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'PERMISSION', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'APPROVE', isGranted: true },
    { role: 'ADMIN', resource: 'SUPPLIER', action: 'REJECT', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'APPROVE', isGranted: true },
    { role: 'ADMIN', resource: 'CONTRACT', action: 'REJECT', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'UPDATE', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'APPROVE', isGranted: true },
    { role: 'ADMIN', resource: 'PAYMENT', action: 'REJECT', isGranted: true },
    { role: 'ADMIN', resource: 'DOCUMENT', action: 'CREATE', isGranted: true },
    { role: 'ADMIN', resource: 'DOCUMENT', action: 'READ', isGranted: true },
    { role: 'ADMIN', resource: 'DOCUMENT', action: 'DELETE', isGranted: true },
    { role: 'ADMIN', resource: 'ANALYTICS', action: 'READ', isGranted: true },
    
    // Procurement Manager permissions
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'UPDATE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'APPROVE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER', action: 'REJECT', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER_CATEGORY', action: 'CREATE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER_CATEGORY', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER_CATEGORY', action: 'UPDATE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'SUPPLIER_CATEGORY', action: 'DELETE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'UPDATE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'APPROVE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'CONTRACT', action: 'REJECT', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'PAYMENT', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'PAYMENT', action: 'APPROVE', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'PAYMENT', action: 'REJECT', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'DOCUMENT', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_MANAGER', resource: 'ANALYTICS', action: 'READ', isGranted: true },
    
    // Procurement Specialist permissions
    { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'CREATE', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER', action: 'UPDATE', isGranted: true, description: 'Can only update suppliers they created' },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'SUPPLIER_CATEGORY', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'CONTRACT', action: 'CREATE', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'CONTRACT', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'CONTRACT', action: 'UPDATE', isGranted: true, description: 'Can only update contracts they created' },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'PAYMENT', action: 'CREATE', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'PAYMENT', action: 'READ', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'PAYMENT', action: 'UPDATE', isGranted: true, description: 'Can only update payments they created' },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'DOCUMENT', action: 'CREATE', isGranted: true },
    { role: 'PROCUREMENT_SPECIALIST', resource: 'DOCUMENT', action: 'READ', isGranted: true },
  ];
  
  // Insert permissions if they don't exist
  for (const perm of defaultPermissions) {
    // Check if permission already exists
    const existing = await db.query.permissions.findFirst({
      where: sql`${db.permissions.role} = ${perm.role} AND ${db.permissions.resource} = ${perm.resource} AND ${db.permissions.action} = ${perm.action}`,
    });
    
    if (!existing) {
      await db.insert(db.permissions).values({
        ...perm,
        updatedAt: new Date(),
      });
    }
  }
}