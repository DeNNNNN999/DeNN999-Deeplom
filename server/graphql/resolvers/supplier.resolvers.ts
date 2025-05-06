import { eq, and, or, like, inArray, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { 
  suppliers, 
  supplierCategories, 
  supplierCategoryMap,
  notificationTypeEnum,
  notifications,
  users,
} from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission, checkOwnership } from '../../utils/permissions';
import { Context } from '../context';
import { createNotification } from '../../services/notification.service';
import { invalidateCacheByPattern } from '../../redis';

export const supplierResolvers = {
  Query: {
    // Get a supplier by ID
    supplier: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('supplier', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get supplier from database
      const result = await db.select().from(suppliers).where(eq(suppliers.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const supplier = result[0];
      
      // Get supplier categories
      const categoriesResult = await db
        .select({
          id: supplierCategories.id,
          name: supplierCategories.name,
          description: supplierCategories.description,
          createdAt: supplierCategories.createdAt,
          updatedAt: supplierCategories.updatedAt,
        })
        .from(supplierCategoryMap)
        .innerJoin(
          supplierCategories,
          eq(supplierCategoryMap.categoryId, supplierCategories.id)
        )
        .where(eq(supplierCategoryMap.supplierId, id));
      
      // Add categories to supplier
      supplier.categories = categoriesResult;
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(supplier), { EX: 3600 });
      
      return supplier;
    },
    
    // Get paginated suppliers with optional filtering
    suppliers: async (
      _: any,
      { 
        pagination, 
        filter 
      }: { 
        pagination: { page: number; limit: number }; 
        filter?: { 
          search?: string; 
          status?: string; 
          categoryIds?: string[];
          country?: string;
        }; 
      },
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
      const cacheKeyName = cacheKey(`suppliers:${page}:${limit}:${JSON.stringify(filter || {})}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build base query
      let query = db.select().from(suppliers);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(suppliers);
      
      // Apply filters if provided
      if (filter) {
        const conditions = [];
        
        // Text search filter
        if (filter.search) {
          conditions.push(
            or(
              like(suppliers.name, `%${filter.search}%`),
              like(suppliers.legalName, `%${filter.search}%`),
              like(suppliers.taxId, `%${filter.search}%`),
              like(suppliers.email, `%${filter.search}%`)
            )
          );
        }
        
        // Status filter
        if (filter.status) {
          conditions.push(eq(suppliers.status, filter.status as any));
        }
        
        // Country filter
        if (filter.country) {
          conditions.push(eq(suppliers.country, filter.country));
        }
        
        // Apply all conditions to both queries
        if (conditions.length > 0) {
          const whereCondition = and(...conditions);
          query = query.where(whereCondition);
          countQuery = countQuery.where(whereCondition);
        }
        
        // Category filter (requires special handling for many-to-many relationship)
        if (filter.categoryIds && filter.categoryIds.length > 0) {
          // Get supplier IDs that have the specified categories
          const suppliersWithCategoriesResult = await db
            .select({ supplierId: supplierCategoryMap.supplierId })
            .from(supplierCategoryMap)
            .where(inArray(supplierCategoryMap.categoryId, filter.categoryIds));
          
          const supplierIds = suppliersWithCategoriesResult.map(s => s.supplierId);
          
          if (supplierIds.length > 0) {
            query = query.where(inArray(suppliers.id, supplierIds));
            countQuery = countQuery.where(inArray(suppliers.id, supplierIds));
          } else {
            // No suppliers with these categories, return empty result
            return {
              items: [],
              total: 0,
              page,
              limit,
              hasMore: false,
            };
          }
        }
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      
      // Execute paginated query
      const result = await query.limit(limit).offset(offset).orderBy(suppliers.createdAt);
      
      // Get categories for each supplier
      const supplierIds = result.map(s => s.id);
      let categoriesMap: Record<string, any[]> = {};
      
      if (supplierIds.length > 0) {
        const categoriesResult = await db
          .select({
            supplierId: supplierCategoryMap.supplierId,
            categoryId: supplierCategories.id,
            categoryName: supplierCategories.name,
            description: supplierCategories.description,
            createdAt: supplierCategories.createdAt,
            updatedAt: supplierCategories.updatedAt,
          })
          .from(supplierCategoryMap)
          .innerJoin(
            supplierCategories,
            eq(supplierCategoryMap.categoryId, supplierCategories.id)
          )
          .where(inArray(supplierCategoryMap.supplierId, supplierIds));
        
        // Group categories by supplier ID
        categoriesResult.forEach(item => {
          if (!categoriesMap[item.supplierId]) {
            categoriesMap[item.supplierId] = [];
          }
          
          categoriesMap[item.supplierId].push({
            id: item.categoryId,
            name: item.categoryName,
            description: item.description,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          });
        });
      }
      
      // Add categories to each supplier
      const suppliersWithCategories = result.map(supplier => ({
        ...supplier,
        categories: categoriesMap[supplier.id] || [],
      }));
      
      const response = {
        items: suppliersWithCategories,
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
    // Create a new supplier
    createSupplier: async (
      _: any,
      { input }: { input: any },
      { user, db, pubsub, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Extract category IDs from input and remove from main object
      const { categoryIds, ...supplierData } = input;
      
      // Create supplier
      const result = await db.insert(suppliers).values({
        ...supplierData,
        status: 'PENDING',
        createdById: user.id,
        updatedById: user.id,
      }).returning();
      
      const newSupplier = result[0];
      
      // Add categories if provided
      if (categoryIds && categoryIds.length > 0) {
        const categoryEntries = categoryIds.map(categoryId => ({
          supplierId: newSupplier.id,
          categoryId,
        }));
        
        await db.insert(supplierCategoryMap).values(categoryEntries);
      }
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'SUPPLIER',
          entityId: newSupplier.id,
          newValues: { ...newSupplier, categoryIds },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for procurement managers
      await createNotification(
        db,
        {
          type: 'SUPPLIER_CREATED',
          roleFilter: 'PROCUREMENT_MANAGER',
          title: 'New Supplier Created',
          message: `A new supplier "${newSupplier.name}" has been created and is pending approval.`,
          entityType: 'SUPPLIER',
          entityId: newSupplier.id,
        }
      );
      
      // Publish subscription event
      pubsub.publish('SUPPLIER_STATUS_UPDATED', { 
        supplierStatusUpdated: newSupplier 
      });
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return newSupplier;
    },
    
    // Update a supplier
    updateSupplier: async (
      _: any,
      { id, input }: { id: string; input: any },
      { user, db, pubsub, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Get current supplier data
      const currentSupplierResult = await db.select().from(suppliers).where(eq(suppliers.id, id));
      
      if (!currentSupplierResult.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentSupplier = currentSupplierResult[0];
      
      // Check ownership or permissions
      // Procurement managers can update any supplier
      // Procurement specialists can only update suppliers they created
      if (user.role !== 'ADMIN' && user.role !== 'PROCUREMENT_MANAGER') {
        checkOwnership(currentSupplier, user.id, user.role, 'update');
      }
      
      // Extract category IDs from input and remove from main object
      const { categoryIds, ...supplierData } = input;
      
      // Update supplier
      const result = await db.update(suppliers)
        .set({
          ...supplierData,
          updatedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();
      
      const updatedSupplier = result[0];
      
      // Update categories if provided
      if (categoryIds) {
        // First, delete existing category mappings
        await db.delete(supplierCategoryMap).where(eq(supplierCategoryMap.supplierId, id));
        
        // Then, insert new ones
        if (categoryIds.length > 0) {
          const categoryEntries = categoryIds.map(categoryId => ({
            supplierId: id,
            categoryId,
          }));
          
          await db.insert(supplierCategoryMap).values(categoryEntries);
        }
      }
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'SUPPLIER',
          entityId: id,
          oldValues: currentSupplier,
          newValues: { ...updatedSupplier, categoryIds },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Publish subscription event if status changed
      if (currentSupplier.status !== updatedSupplier.status) {
        pubsub.publish('SUPPLIER_STATUS_UPDATED', { 
          supplierStatusUpdated: updatedSupplier 
        });
        
        // Create notification if status changed
        if (updatedSupplier.status === 'APPROVED') {
          await createNotification(
            db,
            {
              type: 'SUPPLIER_APPROVED',
              roleFilter: 'PROCUREMENT_SPECIALIST',
              title: 'Supplier Approved',
              message: `Supplier "${updatedSupplier.name}" has been approved.`,
              entityType: 'SUPPLIER',
              entityId: id,
            }
          );
        } else if (updatedSupplier.status === 'REJECTED') {
          await createNotification(
            db,
            {
              type: 'SUPPLIER_REJECTED',
              roleFilter: 'PROCUREMENT_SPECIALIST',
              title: 'Supplier Rejected',
              message: `Supplier "${updatedSupplier.name}" has been rejected.`,
              entityType: 'SUPPLIER',
              entityId: id,
            }
          );
        }
      }
      
      // Invalidate cache
      await redis.del(`supplier:${id}`);
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return updatedSupplier;
    },
    
    // Delete a supplier
    deleteSupplier: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins and procurement managers can delete suppliers
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'delete suppliers');
      
      // Get current supplier data
      const supplierData = await db.select().from(suppliers).where(eq(suppliers.id, id));
      
      if (!supplierData.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Delete supplier category mappings first
      await db.delete(supplierCategoryMap).where(eq(supplierCategoryMap.supplierId, id));
      
      // Delete supplier
      await db.delete(suppliers).where(eq(suppliers.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'SUPPLIER',
          entityId: id,
          oldValues: supplierData[0],
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`supplier:${id}`);
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return true;
    },
    
    // Approve a supplier
    approveSupplier: async (_: any, { id }: { id: string }, { user, db, pubsub, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can approve suppliers
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'approve suppliers');
      
      // Get current supplier data
      const currentSupplierResult = await db.select().from(suppliers).where(eq(suppliers.id, id));
      
      if (!currentSupplierResult.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentSupplier = currentSupplierResult[0];
      
      // Update supplier status
      const result = await db.update(suppliers)
        .set({
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
          updatedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();
      
      const updatedSupplier = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'APPROVE',
          entityType: 'SUPPLIER',
          entityId: id,
          oldValues: currentSupplier,
          newValues: updatedSupplier,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for creator
      if (currentSupplier.createdById) {
        await db.insert(notifications).values({
          userId: currentSupplier.createdById,
          type: 'SUPPLIER_APPROVED',
          title: 'Supplier Approved',
          message: `Your supplier "${updatedSupplier.name}" has been approved.`,
          entityType: 'SUPPLIER',
          entityId: id,
        });
      }
      
      // Publish subscription event
      pubsub.publish('SUPPLIER_STATUS_UPDATED', { 
        supplierStatusUpdated: updatedSupplier 
      });
      
      // Invalidate cache
      await redis.del(`supplier:${id}`);
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return updatedSupplier;
    },
    
    // Reject a supplier
    rejectSupplier: async (
      _: any, 
      { id, reason }: { id: string; reason: string }, 
      { user, db, pubsub, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can reject suppliers
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'reject suppliers');
      
      // Get current supplier data
      const currentSupplierResult = await db.select().from(suppliers).where(eq(suppliers.id, id));
      
      if (!currentSupplierResult.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentSupplier = currentSupplierResult[0];
      
      // Update supplier status and add rejection reason to notes
      const notes = `${currentSupplier.notes || ''}\n\nRejection reason (${new Date().toISOString()}): ${reason}`.trim();
      
      const result = await db.update(suppliers)
        .set({
          status: 'REJECTED',
          notes,
          updatedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();
      
      const updatedSupplier = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'REJECT',
          entityType: 'SUPPLIER',
          entityId: id,
          oldValues: currentSupplier,
          newValues: { ...updatedSupplier, rejectionReason: reason },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for creator
      if (currentSupplier.createdById) {
        await createNotification(
          db,
          {
            userId: currentSupplier.createdById,
            type: 'SUPPLIER_REJECTED',
            title: 'Supplier Rejected',
            message: `Your supplier "${updatedSupplier.name}" has been rejected. Reason: ${reason}`,
            entityType: 'SUPPLIER',
            entityId: id,
          }
        );
      }
      
      // Publish subscription event
      pubsub.publish('SUPPLIER_STATUS_UPDATED', { 
        supplierStatusUpdated: updatedSupplier 
      });
      
      // Invalidate cache
      await redis.del(`supplier:${id}`);
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return updatedSupplier;
    },
    
    // Rate a supplier
    rateSupplier: async (
      _: any,
      { input }: { input: { supplierId: string; financialStability?: number; qualityRating?: number; deliveryRating?: number; communicationRating?: number; overallRating?: number } },
      { user, db, req, redis }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement specialists, managers and admins can rate suppliers
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST'], 'rate suppliers');
      
      const { supplierId, ...ratings } = input;
      
      // Get current supplier data
      const currentSupplierResult = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
      
      if (!currentSupplierResult.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentSupplier = currentSupplierResult[0];
      
      // Validate ratings (1-5 scale)
      Object.entries(ratings).forEach(([key, value]) => {
        if (typeof value === 'number' && (value < 1 || value > 5)) {
          throw new GraphQLError(`Rating ${key} must be between 1 and 5`, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      });
      
      // Calculate overall rating if not provided explicitly
      if (!ratings.overallRating) {
        const ratingValues = Object.values(ratings).filter(v => typeof v === 'number') as number[];
        if (ratingValues.length > 0) {
          const sum = ratingValues.reduce((a, b) => a + b, 0);
          ratings.overallRating = Math.round(sum / ratingValues.length);
        }
      }
      
      // Update supplier ratings
      const result = await db.update(suppliers)
        .set({
          ...ratings,
          updatedById: user.id,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, supplierId))
        .returning();
      
      const updatedSupplier = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'RATE',
          entityType: 'SUPPLIER',
          entityId: supplierId,
          oldValues: {
            financialStability: currentSupplier.financialStability,
            qualityRating: currentSupplier.qualityRating,
            deliveryRating: currentSupplier.deliveryRating,
            communicationRating: currentSupplier.communicationRating,
            overallRating: currentSupplier.overallRating,
          },
          newValues: ratings,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`supplier:${supplierId}`);
      await invalidateCacheByPattern(redis, 'suppliers:*');
      
      return updatedSupplier;
    },
  },
  
  Subscription: {
    // Subscribe to supplier status updates
    supplierStatusUpdated: {
      subscribe: (_: any, __: any, { pubsub }: Context) => pubsub.asyncIterator(['SUPPLIER_STATUS_UPDATED']),
    },
  },
  
  // Field resolvers
  Supplier: {
    // Resolve createdBy field
    createdBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.createdById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.createdById));
      return result.length ? result[0] : null;
    },
    
    // Resolve updatedBy field
    updatedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.updatedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.updatedById));
      return result.length ? result[0] : null;
    },
    
    // Resolve approvedBy field
    approvedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.approvedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.approvedById));
      return result.length ? result[0] : null;
    },
    
    // Resolve categories field if not already loaded
    categories: async (parent: any, _: any, { db }: Context) => {
      if (parent.categories) return parent.categories;
      
      const result = await db
        .select({
          id: supplierCategories.id,
          name: supplierCategories.name,
          description: supplierCategories.description,
          createdAt: supplierCategories.createdAt,
          updatedAt: supplierCategories.updatedAt,
        })
        .from(supplierCategoryMap)
        .innerJoin(
          supplierCategories,
          eq(supplierCategoryMap.categoryId, supplierCategories.id)
        )
        .where(eq(supplierCategoryMap.supplierId, parent.id));
      
      return result;
    },
  },
};