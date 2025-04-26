import { eq, and, sql, desc, asc, or, like, between, gt, lt, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { payments, users, suppliers, contracts, documents } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { checkPermission, checkOwnership } from '../../utils/permissions';
import { Context } from '../context';
import { createNotification } from '../../services/notification.service';
import { invalidateCacheByPattern } from '../../redis';

export const paymentResolvers = {
  Query: {
    // Get a payment by ID
    payment: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('payment', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get payment from database
      const result = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Payment not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result[0]), { EX: 3600 });
      
      return result[0];
    },
    
    // Get paginated payments with optional filtering
    payments: async (
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
          contractId?: string;
          dateFrom?: Date;
          dateTo?: Date;
          minAmount?: number;
          maxAmount?: number;
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
      const cacheKeyName = cacheKey(`payments:${page}:${limit}:${JSON.stringify(filter || {})}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build base query
      let query = db.select().from(payments);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(payments);
      
      // Apply filters if provided
      if (filter) {
        const conditions = [];
        
        // Text search filter
        if (filter.search) {
          conditions.push(
            or(
              like(payments.description, `%${filter.search}%`),
              like(payments.invoiceNumber, `%${filter.search}%`)
            )
          );
        }
        
        // Status filter
        if (filter.status) {
          conditions.push(eq(payments.status, filter.status as any));
        }
        
        // Supplier filter
        if (filter.supplierId) {
          conditions.push(eq(payments.supplierId, filter.supplierId));
        }
        
        // Contract filter
        if (filter.contractId) {
          conditions.push(eq(payments.contractId, filter.contractId));
        }
        
        // Date filters - use either dueDate or invoiceDate as available
        if (filter.dateFrom) {
          conditions.push(
            or(
              gt(payments.dueDate, filter.dateFrom),
              gt(payments.invoiceDate, filter.dateFrom)
            )
          );
        }
        
        if (filter.dateTo) {
          conditions.push(
            or(
              lt(payments.dueDate, filter.dateTo),
              lt(payments.invoiceDate, filter.dateTo)
            )
          );
        }
        
        // Amount filters
        if (filter.minAmount !== undefined) {
          conditions.push(gt(payments.amount, filter.minAmount));
        }
        
        if (filter.maxAmount !== undefined) {
          conditions.push(lt(payments.amount, filter.maxAmount));
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
      const result = await query.limit(limit).offset(offset).orderBy(desc(payments.createdAt));
      
      // Enrich with supplier and contract data
      const paymentsWithRelations = await Promise.all(
        result.map(async (payment) => {
          // Get supplier
          const supplierResult = await db
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, payment.supplierId));
          
          // Get contract if available
          let contract = null;
          if (payment.contractId) {
            const contractResult = await db
              .select()
              .from(contracts)
              .where(eq(contracts.id, payment.contractId));
            
            if (contractResult.length) {
              contract = contractResult[0];
            }
          }
          
          return {
            ...payment,
            supplier: supplierResult[0],
            contract
          };
        })
      );
      
      const response = {
        items: paymentsWithRelations,
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
    // Create a new payment
    createPayment: async (
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
      
      // Check if contract exists if contractId is provided
      if (input.contractId) {
        const contractResult = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, input.contractId));
        
        if (!contractResult.length) {
          throw new GraphQLError('Contract not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        
        // Check if contract belongs to the specified supplier
        if (contractResult[0].supplierId !== input.supplierId) {
          throw new GraphQLError('Contract does not belong to the specified supplier', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }
      
      // Create payment
      const result = await db.insert(payments).values({
        ...input,
        requestedById: user.id,
        status: 'PENDING',
      }).returning();
      
      const newPayment = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'CREATE',
          entityType: 'PAYMENT',
          entityId: newPayment.id,
          newValues: newPayment,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for procurement managers
      await createNotification(
        db,
        {
          type: 'PAYMENT_REQUESTED',
          roleFilter: 'PROCUREMENT_MANAGER',
          title: 'New Payment Requested',
          message: `A new payment of ${newPayment.currency} ${newPayment.amount} for ${supplierResult[0].name} has been requested.`,
          entityType: 'PAYMENT',
          entityId: newPayment.id,
        }
      );
      
      // Publish subscription event
      pubsub.publish('PAYMENT_STATUS_UPDATED', { 
        paymentStatusUpdated: newPayment 
      });
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'payments:*');
      
      return newPayment;
    },
    
    // Update a payment
    updatePayment: async (
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
      
      // Get current payment data
      const currentPaymentResult = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!currentPaymentResult.length) {
        throw new GraphQLError('Payment not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentPayment = currentPaymentResult[0];
      
      // Check ownership or permissions
      // Procurement managers and admins can update any payment
      // Procurement specialists can only update payments they requested
      if (user.role !== 'ADMIN' && user.role !== 'PROCUREMENT_MANAGER') {
        if (currentPayment.requestedById !== user.id) {
          throw new GraphQLError('You can only update payments you requested', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        
        // Specialists can't change status
        if (input.status && input.status !== currentPayment.status) {
          throw new GraphQLError('You cannot change the payment status', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
      }
      
      // Update payment
      const result = await db.update(payments)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();
      
      const updatedPayment = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'PAYMENT',
          entityId: id,
          oldValues: currentPayment,
          newValues: updatedPayment,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Publish subscription event if status changed
      if (currentPayment.status !== updatedPayment.status) {
        pubsub.publish('PAYMENT_STATUS_UPDATED', { 
          paymentStatusUpdated: updatedPayment 
        });
        
        // Create notification if status changed
        if (updatedPayment.status === 'APPROVED' && currentPayment.requestedById) {
          await createNotification(
            db,
            {
              userId: currentPayment.requestedById,
              type: 'PAYMENT_APPROVED',
              title: 'Payment Approved',
              message: `Payment of ${updatedPayment.currency} ${updatedPayment.amount} has been approved.`,
              entityType: 'PAYMENT',
              entityId: id,
            }
          );
        } else if (updatedPayment.status === 'REJECTED' && currentPayment.requestedById) {
          await createNotification(
            db,
            {
              userId: currentPayment.requestedById,
              type: 'PAYMENT_REJECTED',
              title: 'Payment Rejected',
              message: `Payment of ${updatedPayment.currency} ${updatedPayment.amount} has been rejected.`,
              entityType: 'PAYMENT',
              entityId: id,
            }
          );
        }
      }
      
      // Invalidate cache
      await redis.del(`payment:${id}`);
      await invalidateCacheByPattern(redis, 'payments:*');
      
      return updatedPayment;
    },
    
    // Delete a payment
    deletePayment: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins and procurement managers can delete payments
      // Or if specialist created the payment and it's still pending
      const paymentData = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!paymentData.length) {
        throw new GraphQLError('Payment not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const payment = paymentData[0];
      
      if (user.role !== 'ADMIN' && user.role !== 'PROCUREMENT_MANAGER') {
        if (payment.requestedById !== user.id) {
          throw new GraphQLError('You can only delete payments you requested', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
        
        if (payment.status !== 'PENDING') {
          throw new GraphQLError('You can only delete pending payments', {
            extensions: { code: 'FORBIDDEN' },
          });
        }
      }
      
      // Delete payment
      await db.delete(payments).where(eq(payments.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'PAYMENT',
          entityId: id,
          oldValues: payment,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`payment:${id}`);
      await invalidateCacheByPattern(redis, 'payments:*');
      
      return true;
    },
    
    // Approve a payment
    approvePayment: async (_: any, { id }: { id: string }, { user, db, pubsub, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only procurement managers and admins can approve payments
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'approve payments');
      
      // Get current payment data
      const currentPaymentResult = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!currentPaymentResult.length) {
        throw new GraphQLError('Payment not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentPayment = currentPaymentResult[0];
      
      // Update payment status
      const result = await db.update(payments)
        .set({
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();
      
      const updatedPayment = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'APPROVE',
          entityType: 'PAYMENT',
          entityId: id,
          oldValues: currentPayment,
          newValues: updatedPayment,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for requester
      if (currentPayment.requestedById) {
        await createNotification(
          db,
          {
            userId: currentPayment.requestedById,
            type: 'PAYMENT_APPROVED',
            title: 'Payment Approved',
            message: `Your payment request of ${updatedPayment.currency} ${updatedPayment.amount} has been approved.`,
            entityType: 'PAYMENT',
            entityId: id,
          }
        );
      }
      
      // Publish subscription event
      pubsub.publish('PAYMENT_STATUS_UPDATED', { 
        paymentStatusUpdated: updatedPayment 
      });
      
      // Invalidate cache
      await redis.del(`payment:${id}`);
      await invalidateCacheByPattern(redis, 'payments:*');
      
      return updatedPayment;
    },
    
    // Reject a payment
    rejectPayment: async (
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
      
      // Only procurement managers and admins can reject payments
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'reject payments');
      
      // Get current payment data
      const currentPaymentResult = await db.select().from(payments).where(eq(payments.id, id));
      
      if (!currentPaymentResult.length) {
        throw new GraphQLError('Payment not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentPayment = currentPaymentResult[0];
      
      // Update payment status and add rejection reason to notes
      const notes = `${currentPayment.notes || ''}\n\nRejection reason (${new Date().toISOString()}): ${reason}`.trim();
      
      const result = await db.update(payments)
        .set({
          status: 'REJECTED',
          notes,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();
      
      const updatedPayment = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'REJECT',
          entityType: 'PAYMENT',
          entityId: id,
          oldValues: currentPayment,
          newValues: { ...updatedPayment, rejectionReason: reason },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for requester
      if (currentPayment.requestedById) {
        await createNotification(
          db,
          {
            userId: currentPayment.requestedById,
            type: 'PAYMENT_REJECTED',
            title: 'Payment Rejected',
            message: `Your payment request of ${updatedPayment.currency} ${updatedPayment.amount} has been rejected. Reason: ${reason}`,
            entityType: 'PAYMENT',
            entityId: id,
          }
        );
      }
      
      // Publish subscription event
      pubsub.publish('PAYMENT_STATUS_UPDATED', { 
        paymentStatusUpdated: updatedPayment 
      });
      
      // Invalidate cache
      await redis.del(`payment:${id}`);
      await invalidateCacheByPattern(redis, 'payments:*');
      
      return updatedPayment;
    },
  },
  
  Subscription: {
    // Subscribe to payment status updates
    paymentStatusUpdated: {
      subscribe: (_: any, __: any, { pubsub }: Context) => pubsub.asyncIterator(['PAYMENT_STATUS_UPDATED']),
    },
  },
  
  // Field resolvers
  Payment: {
    // Resolve supplier field
    supplier: async (parent: any, _: any, { db }: Context) => {
      const result = await db.select().from(suppliers).where(eq(suppliers.id, parent.supplierId));
      return result.length ? result[0] : null;
    },
    
    // Resolve contract field
    contract: async (parent: any, _: any, { db }: Context) => {
      if (!parent.contractId) return null;
      
      const result = await db.select().from(contracts).where(eq(contracts.id, parent.contractId));
      return result.length ? result[0] : null;
    },
    
    // Resolve requestedBy field
    requestedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.requestedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.requestedById));
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
      const result = await db.select().from(documents).where(eq(documents.paymentId, parent.id));
      return result;
    },
  },
};