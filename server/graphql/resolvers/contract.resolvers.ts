import { eq, and, sql, desc, asc, or, like, between, gt, lt, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { contracts, users, suppliers, documents, payments, notifications } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission, checkOwnership } from '../../utils/permissions';
import { Context } from '../context';
import { createNotification } from '../../services/notification.service';
import { invalidateCacheByPattern } from '../../redis';
import { parseDate, formatDate } from '../../utils/date-helpers';

export const contractResolvers = {
  Query: {
    // Get a contract by ID
    contract: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('contract', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get contract from database
      const result = await db.select().from(contracts).where(eq(contracts.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Contract not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const contract = result[0];
      
      // Calculate days remaining (if contract is active)
      if (contract.status === 'ACTIVE') {
        const endDate = new Date(contract.endDate);
        const today = new Date();
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        contract.daysRemaining = daysRemaining;
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(contract), { EX: 3600 });
      
      return contract;
    },
    
    // Get paginated contracts with optional filtering
    contracts: async (
      _: any,
      { 
        pagination, 
        filter 
      }: { 
        pagination: { page: number; limit: number }; 
        filter?: { 
          search?: string; 
          status?: string; 
          supplierId?: string;
          startDateFrom?: string;
          startDateTo?: string;
          endDateFrom?: string;
          endDateTo?: string;
          minValue?: number;
          maxValue?: number;
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
      const cacheKeyName = cacheKey(`contracts:${page}:${limit}:${JSON.stringify(filter || {})}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build base query
      let query = db.select().from(contracts);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(contracts);
      
      // Apply filters if provided
      if (filter) {
        const conditions = [];
        
        // Text search filter
        if (filter.search) {
          conditions.push(
            or(
              like(contracts.title, `%${filter.search}%`),
              like(contracts.contractNumber, `%${filter.search}%`),
              like(contracts.description, `%${filter.search}%`)
            )
          );
        }
        
        // Status filter
        if (filter.status) {
          conditions.push(eq(contracts.status, filter.status as any));
        }
        
        // Supplier filter
        if (filter.supplierId) {
          conditions.push(eq(contracts.supplierId, filter.supplierId));
        }
        
        // Date filters
        if (filter.startDateFrom) {
          conditions.push(gt(contracts.startDate, filter.startDateFrom));
        }
        
        if (filter.startDateTo) {
          conditions.push(lt(contracts.startDate, filter.startDateTo));
        }
        
        if (filter.endDateFrom) {
          conditions.push(gt(contracts.endDate, filter.endDateFrom));
        }
        
        if (filter.endDateTo) {
          conditions.push(lt(contracts.endDate, filter.endDateTo));
        }
        
        // Value filters
        if (filter.minValue !== undefined) {
          conditions.push(gt(contracts.value, filter.minValue));
        }
        
        if (filter.maxValue !== undefined) {
          conditions.push(lt(contracts.value, filter.maxValue));
        }
        
        // Apply all conditions to both queries
        if (conditions.length > 0) {
          const whereCondition = and(...conditions);
          query = query.where(whereCondition);
          countQuery = countQuery.where(whereCondition);
        }
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      
      // Execute paginated query
      const result = await query.limit(limit).offset(offset).orderBy(desc(contracts.createdAt));
      
      // Enrich with supplier data
      const contractsWithData = await Promise.all(
        result.map(async (contract) => {
          // Get supplier
          const supplierResult = await db
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, contract.supplierId));
          
          // Calculate days remaining if contract is active
          let daysRemaining = null;
          if (contract.status === 'ACTIVE') {
            const endDate = new Date(contract.endDate);
            const today = new Date();
            daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          return {
            ...contract,
            supplier: supplierResult[0],
            daysRemaining
          };
        })
      );
      
      const response = {
        items: contractsWithData,
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
    // Create a new contract
    createContract: async (
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
      
      // Check if supplier exists
      const supplierResult = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));
      
      if (!supplierResult.length) {
        throw new GraphQLError('Supplier not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Проверяем, что даты в правильном формате
      if (!input.startDate || !input.endDate) {
        throw new GraphQLError('Даты начала и окончания обязательны', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Проверяем, что дата окончания позже даты начала
      try {
        // Преобразуем строки в объекты даты только для сравнения
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new GraphQLError('Неверный формат даты. Используйте формат YYYY-MM-DD', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        
        if (endDate <= startDate) {
          throw new GraphQLError('Дата окончания должна быть позже даты начала', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        
        console.log('Date comparison successful');
      } catch (error) {
        console.error('Error comparing dates:', error);
        throw new GraphQLError('Ошибка при сравнении дат. Используйте формат YYYY-MM-DD', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Данные контракта для вставки в БД
      // ВАЖНО: Даты сохраняем как строки, а не как объекты Date
      const contractData = {
        ...input,
        createdById: user.id,
        updatedById: user.id,
      };
      
      console.log('Contract data to be inserted:', JSON.stringify(contractData));
      
      // Create contract
      const result = await db.insert(contracts).values(contractData).returning();
      
      const newContract = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'CONTRACT',
          entityId: newContract.id,
          newValues: newContract,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for procurement managers
      await createNotification(
        db,
        {
          type: 'CONTRACT_CREATED',
          roleFilter: 'PROCUREMENT_MANAGER',
          title: 'New Contract Created',
          message: `A new contract "${newContract.title}" with ${supplierResult[0].name} has been created and is pending approval.`,
          entityType: 'CONTRACT',
          entityId: newContract.id,
        }
      );
      
      // Publish subscription event
      pubsub.publish('CONTRACT_STATUS_UPDATED', { 
        contractStatusUpdated: newContract 
      });
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'contracts:*');
      
      return newContract;
    },
    
    // Update a contract
    updateContract: async (
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
      
      // Get current contract data
      const currentContractResult = await db.select().from(contracts).where(eq(contracts.id, id));
      
      if (!currentContractResult.length) {
        throw new GraphQLError('Contract not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentContract = currentContractResult[0];
      
      // Check ownership or permissions
      // Procurement managers and admins can update any contract
      // Procurement specialists can only update contracts they created
      if (user.role !== 'ADMIN' && user.role !== 'PROCUREMENT_MANAGER') {
        checkOwnership(currentContract, user.id, user.role, 'update');
      }
      
      // Validate dates if being updated
      // Преобразуем даты в объекты Date для сравнения
      const updateData: any = { ...input };
      
      if (input.startDate && input.endDate) {
        try {
          const startDate = new Date(input.startDate);
          const endDate = new Date(input.endDate);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new GraphQLError('Неверный формат даты. Используйте формат YYYY-MM-DD', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
          
          if (endDate <= startDate) {
            throw new GraphQLError('Дата окончания должна быть позже даты начала', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
        } catch (error) {
          console.error('Error comparing dates:', error);
          throw new GraphQLError('Ошибка при сравнении дат. Используйте формат YYYY-MM-DD', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      } else if (input.startDate && !input.endDate) {
        try {
          const startDate = new Date(input.startDate);
          const endDate = new Date(currentContract.endDate);
          
          if (isNaN(startDate.getTime())) {
            throw new GraphQLError('Неверный формат даты начала. Используйте формат YYYY-MM-DD', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
          
          if (endDate <= startDate) {
            throw new GraphQLError('Дата окончания должна быть позже даты начала', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
        } catch (error) {
          console.error('Error comparing dates:', error);
          throw new GraphQLError('Ошибка при сравнении дат. Используйте формат YYYY-MM-DD', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      } else if (!input.startDate && input.endDate) {
        try {
          const startDate = new Date(currentContract.startDate);
          const endDate = new Date(input.endDate);
          
          if (isNaN(endDate.getTime())) {
            throw new GraphQLError('Неверный формат даты окончания. Используйте формат YYYY-MM-DD', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
          
          if (endDate <= startDate) {
            throw new GraphQLError('Дата окончания должна быть позже даты начала', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
        } catch (error) {
          console.error('Error comparing dates:', error);
          throw new GraphQLError('Ошибка при сравнении дат. Используйте формат YYYY-MM-DD', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }
      
      // Добавляем информацию о обновлении
      updateData.updatedById = user.id;
      updateData.updatedAt = new Date().toISOString();
      
      // Update contract
      const result = await db.update(contracts)
        .set(updateData)
        .where(eq(contracts.id, id))
        .returning();
      
      const updatedContract = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'CONTRACT',
          entityId: id,
          oldValues: currentContract,
          newValues: updatedContract,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Publish subscription event if status changed
      if (currentContract.status !== updatedContract.status) {
        pubsub.publish('CONTRACT_STATUS_UPDATED', { 
          contractStatusUpdated: updatedContract 
        });
        
        // Create notification if status changed
        if (updatedContract.status === 'APPROVED') {
          await createNotification(
            db,
            {
              type: 'CONTRACT_APPROVED',
              roleFilter: 'PROCUREMENT_SPECIALIST',
              title: 'Contract Approved',
              message: `Contract "${updatedContract.title}" has been approved.`,
              entityType: 'CONTRACT',
              entityId: id,
            }
          );
        } else if (updatedContract.status === 'REJECTED') {
          await createNotification(
            db,
            {
              type: 'CONTRACT_REJECTED',
              roleFilter: 'PROCUREMENT_SPECIALIST',
              title: 'Contract Rejected',
              message: `Contract "${updatedContract.title}" has been rejected.`,
              entityType: 'CONTRACT',
              entityId: id,
            }
          );
        }
      }
      
      // Invalidate cache
      await redis.del(`contract:${id}`);
      await invalidateCacheByPattern(redis, 'contracts:*');
      
      return updatedContract;
    },
    
    // Delete a contract
    deleteContract: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins and procurement managers can delete contracts
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'delete contracts');
      
      // Get current contract data
      const contractData = await db.select().from(contracts).where(eq(contracts.id, id));
      
      if (!contractData.length) {
        throw new GraphQLError('Contract not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Delete contract
      await db.delete(contracts).where(eq(contracts.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'CONTRACT',
          entityId: id,
          oldValues: contractData[0],
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`contract:${id}`);
      await invalidateCacheByPattern(redis, 'contracts:*');
      
      return true;
    },
    
    // Approve a contract
    approveContract: async (_: any, { id }: { id: string }, { user, db, pubsub, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can approve contracts
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'approve contracts');
      
      // Get current contract data
      const currentContractResult = await db.select().from(contracts).where(eq(contracts.id, id));
      
      if (!currentContractResult.length) {
        throw new GraphQLError('Contract not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentContract = currentContractResult[0];
      
      // Update contract status
      const now = new Date().toISOString();
      const result = await db.update(contracts)
        .set({
          status: 'ACTIVE',
          approvedById: user.id,
          approvedAt: now,
          updatedById: user.id,
          updatedAt: now,
        })
        .where(eq(contracts.id, id))
        .returning();
      
      const updatedContract = result[0];
      
      // Get supplier info for notification
      const supplierResult = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, updatedContract.supplierId));
      
      const supplier = supplierResult[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'APPROVE',
          entityType: 'CONTRACT',
          entityId: id,
          oldValues: currentContract,
          newValues: updatedContract,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for creator
      if (currentContract.createdById) {
        await db.insert(notifications).values({
          userId: currentContract.createdById,
          type: 'CONTRACT_APPROVED',
          title: 'Contract Approved',
          message: `Your contract "${updatedContract.title}" with ${supplier.name} has been approved.`,
          entityType: 'CONTRACT',
          entityId: id,
        });
      }
      
      // Publish subscription event
      pubsub.publish('CONTRACT_STATUS_UPDATED', { 
        contractStatusUpdated: updatedContract 
      });
      
      // Invalidate cache
      await redis.del(`contract:${id}`);
      await invalidateCacheByPattern(redis, 'contracts:*');
      
      return updatedContract;
    },
    
    // Reject a contract
    rejectContract: async (
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
      
      // Only procurement managers and admins can reject contracts
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'reject contracts');
      
      // Get current contract data
      const currentContractResult = await db.select().from(contracts).where(eq(contracts.id, id));
      
      if (!currentContractResult.length) {
        throw new GraphQLError('Contract not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentContract = currentContractResult[0];
      
      // Get supplier info for notification
      const supplierResult = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, currentContract.supplierId));
      
      const supplier = supplierResult[0];
      
      // Update contract status and add rejection reason to terms
      const now = new Date().toISOString();
      const terms = `${currentContract.terms || ''}\n\nRejection reason (${now}): ${reason}`.trim();
      
      const result = await db.update(contracts)
        .set({
          status: 'REJECTED',
          terms,
          updatedById: user.id,
          updatedAt: now,
        })
        .where(eq(contracts.id, id))
        .returning();
      
      const updatedContract = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'REJECT',
          entityType: 'CONTRACT',
          entityId: id,
          oldValues: currentContract,
          newValues: { ...updatedContract, rejectionReason: reason },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for creator
      if (currentContract.createdById) {
        await createNotification(
          db,
          {
            userId: currentContract.createdById,
            type: 'CONTRACT_REJECTED',
            title: 'Contract Rejected',
            message: `Your contract "${updatedContract.title}" with ${supplier.name} has been rejected. Reason: ${reason}`,
            entityType: 'CONTRACT',
            entityId: id,
          }
        );
      }
      
      // Publish subscription event
      pubsub.publish('CONTRACT_STATUS_UPDATED', { 
        contractStatusUpdated: updatedContract 
      });
      
      // Invalidate cache
      await redis.del(`contract:${id}`);
      await invalidateCacheByPattern(redis, 'contracts:*');
      
      return updatedContract;
    },
  },
  
  Subscription: {
    // Subscribe to contract status updates
    contractStatusUpdated: {
      subscribe: (_: any, __: any, { pubsub }: Context) => pubsub.asyncIterator(['CONTRACT_STATUS_UPDATED']),
    },
  },
  
  // Field resolvers
  Contract: {
    // Resolve supplier field
    supplier: async (parent: any, _: any, { db }: Context) => {
      const result = await db.select().from(suppliers).where(eq(suppliers.id, parent.supplierId));
      return result.length ? result[0] : null;
    },
    
    // Resolve createdBy field
    createdBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.createdById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.createdById));
      return result.length ? result[0] : null;
    },
    
    // Resolve approvedBy field
    approvedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.approvedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.approvedById));
      return result.length ? result[0] : null;
    },
    
    // Resolve documents field
    documents: async (parent: any, _: any, { db }: Context) => {
      const result = await db.select().from(documents).where(eq(documents.contractId, parent.id));
      return result;
    },
    
    // Resolve days remaining (if not already calculated)
    daysRemaining: (parent: any) => {
      if (parent.daysRemaining !== undefined) return parent.daysRemaining;
      
      if (parent.status === 'ACTIVE') {
        const endDate = new Date(parent.endDate);
        const today = new Date();
        return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return null;
    },
  },
};