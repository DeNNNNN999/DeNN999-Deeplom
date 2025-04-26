import { eq, like, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { supplierCategories, users } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission } from '../../utils/permissions';
import { Context } from '../context';
import { invalidateCacheByPattern } from '../../redis';

export const supplierCategoryResolvers = {
  Query: {
    // Get a supplier category by ID
    supplierCategory: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('supplierCategory', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get from database
      const result = await db.select().from(supplierCategories).where(eq(supplierCategories.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Supplier category not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result[0]), { EX: 3600 });
      
      return result[0];
    },
    
    // Get paginated supplier categories with optional search
    supplierCategories: async (
      _: any, 
      { pagination, search }: { pagination: { page: number; limit: number }; search?: string }, 
      { user, db, redis, cacheKey }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;
      
      // Generate cache key based on query parameters
      const cacheKeyName = cacheKey(`supplierCategories:${page}:${limit}:${search || ''}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build query with optional search
      let query = db.select().from(supplierCategories);
      
      if (search) {
        query = query.where(
          sql`(${supplierCategories.name} ILIKE ${'%' + search + '%'} OR 
               ${supplierCategories.description} ILIKE ${'%' + search + '%'})`
        );
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: sql`COUNT(*)` }).from(supplierCategories);
      const total = Number(countResult[0].count);
      
      // Execute paginated query
      const result = await query.limit(limit).offset(offset).orderBy(supplierCategories.name);
      
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
    // Create a new supplier category
    createSupplierCategory: async (
      _: any, 
      { input }: { input: { name: string; description?: string } }, 
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can create categories
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'create supplier categories');
      
      const { name, description } = input;
      
      // Check if category name already exists
      const existingCategory = await db.select().from(supplierCategories).where(eq(supplierCategories.name, name));
      
      if (existingCategory.length) {
        throw new GraphQLError('A category with this name already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Create category
      const result = await db.insert(supplierCategories).values({
        name,
        description,
        createdById: user.id,
      }).returning();
      
      const newCategory = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'SUPPLIER_CATEGORY',
          entityId: newCategory.id,
          newValues: newCategory,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'supplierCategories:*');
      
      return newCategory;
    },
    
    // Update a supplier category
    updateSupplierCategory: async (
      _: any, 
      { id, input }: { id: string; input: { name: string; description?: string } }, 
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can update categories
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'update supplier categories');
      
      const { name, description } = input;
      
      // Get current category data
      const currentCategoryResult = await db.select().from(supplierCategories).where(eq(supplierCategories.id, id));
      
      if (!currentCategoryResult.length) {
        throw new GraphQLError('Supplier category not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentCategory = currentCategoryResult[0];
      
      // Check if the new name already exists for another category
      if (name !== currentCategory.name) {
        const existingCategory = await db.select().from(supplierCategories).where(eq(supplierCategories.name, name));
        
        if (existingCategory.length) {
          throw new GraphQLError('A category with this name already exists', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }
      
      // Update category
      const result = await db.update(supplierCategories)
        .set({
          name,
          description,
          updatedAt: new Date(),
        })
        .where(eq(supplierCategories.id, id))
        .returning();
      
      const updatedCategory = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'SUPPLIER_CATEGORY',
          entityId: id,
          oldValues: currentCategory,
          newValues: updatedCategory,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`supplierCategory:${id}`);
      await invalidateCacheByPattern(redis, 'supplierCategories:*');
      await invalidateCacheByPattern(redis, 'suppliers:*'); // Invalidate suppliers cache too as they include categories
      
      return updatedCategory;
    },
    
    // Delete a supplier category
    deleteSupplierCategory: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins and procurement managers can delete categories
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'delete supplier categories');
      
      // Get current category data
      const categoryData = await db.select().from(supplierCategories).where(eq(supplierCategories.id, id));
      
      if (!categoryData.length) {
        throw new GraphQLError('Supplier category not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Delete category
      await db.delete(supplierCategories).where(eq(supplierCategories.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'SUPPLIER_CATEGORY',
          entityId: id,
          oldValues: categoryData[0],
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`supplierCategory:${id}`);
      await invalidateCacheByPattern(redis, 'supplierCategories:*');
      await invalidateCacheByPattern(redis, 'suppliers:*'); // Invalidate suppliers cache too as they include categories
      
      return true;
    },
  },
  
  // Field resolvers
  SupplierCategory: {
    // Resolve createdBy field
    createdBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.createdById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.createdById));
      return result.length ? result[0] : null;
    },
  },
};