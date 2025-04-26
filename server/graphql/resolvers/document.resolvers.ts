import { eq, and, sql, desc, or, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { documents, users, suppliers, contracts, payments } from '../../db/schema';
import { createAuditLog } from '../../services/auditLog.service';
import { createNotification } from '../../services/notification.service';
import { Context } from '../context';
import { invalidateCacheByPattern } from '../../redis';

export const documentResolvers = {
  Query: {
    // Get a document by ID
    document: async (_: any, { id }: { id: string }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('document', id);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get document from database
      const result = await db.select().from(documents).where(eq(documents.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result[0]), { EX: 3600 });
      
      return result[0];
    },
    
    // Get paginated documents with optional filtering
    documents: async (
      _: any,
      { 
        pagination, 
        supplierId,
        contractId,
        paymentId
      }: { 
        pagination: { page: number; limit: number }; 
        supplierId?: string;
        contractId?: string;
        paymentId?: string;
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
      const cacheKeyName = cacheKey(`documents:${page}:${limit}:${supplierId || ''}:${contractId || ''}:${paymentId || ''}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Build base query
      let query = db.select().from(documents);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(documents);
      
      // Apply filters
      const conditions = [];
      
      if (supplierId) {
        conditions.push(eq(documents.supplierId, supplierId));
      }
      
      if (contractId) {
        conditions.push(eq(documents.contractId, contractId));
      }
      
      if (paymentId) {
        conditions.push(eq(documents.paymentId, paymentId));
      }
      
      // Apply all conditions to both queries
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
        .orderBy(desc(documents.createdAt))
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
    // Upload a new document
    uploadDocument: async (
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
      
      // Validate that at least one of supplierId, contractId, or paymentId is provided
      if (!input.supplierId && !input.contractId && !input.paymentId) {
        throw new GraphQLError('At least one of supplierId, contractId, or paymentId is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Check if the referenced entities exist
      if (input.supplierId) {
        const supplierExists = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, input.supplierId));
        
        if (!supplierExists.length) {
          throw new GraphQLError('Supplier not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
      }
      
      if (input.contractId) {
        const contractExists = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, input.contractId));
        
        if (!contractExists.length) {
          throw new GraphQLError('Contract not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
      }
      
      if (input.paymentId) {
        const paymentExists = await db
          .select()
          .from(payments)
          .where(eq(payments.id, input.paymentId));
        
        if (!paymentExists.length) {
          throw new GraphQLError('Payment not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
      }
      
      // Create document
      const result = await db.insert(documents).values({
        ...input,
        uploadedById: user.id,
      }).returning();
      
      const newDocument = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'UPLOAD',
          entityType: 'DOCUMENT',
          entityId: newDocument.id,
          newValues: newDocument,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Create notification for relevant users
      let notificationMessage = `A new document "${newDocument.name}" has been uploaded`;
      let entityType = 'DOCUMENT';
      let entityId = newDocument.id;
      
      if (input.supplierId) {
        const supplierResult = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, input.supplierId));
        
        if (supplierResult.length) {
          notificationMessage += ` for supplier ${supplierResult[0].name}`;
          
          // Notify related users (creator, approver)
          if (supplierResult[0].createdById && supplierResult[0].createdById !== user.id) {
            await createNotification(
              db,
              {
                userId: supplierResult[0].createdById,
                type: 'DOCUMENT_UPLOADED',
                title: 'New Document Uploaded',
                message: notificationMessage,
                entityType,
                entityId,
              }
            );
          }
        }
      }
      
      if (input.contractId) {
        const contractResult = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, input.contractId));
        
        if (contractResult.length) {
          notificationMessage += ` for contract ${contractResult[0].title}`;
          
          // Notify related users (creator, approver)
          if (contractResult[0].createdById && contractResult[0].createdById !== user.id) {
            await createNotification(
              db,
              {
                userId: contractResult[0].createdById,
                type: 'DOCUMENT_UPLOADED',
                title: 'New Document Uploaded',
                message: notificationMessage,
                entityType,
                entityId,
              }
            );
          }
        }
      }
      
      if (input.paymentId) {
        const paymentResult = await db
          .select()
          .from(payments)
          .where(eq(payments.id, input.paymentId));
        
        if (paymentResult.length) {
          notificationMessage += ` for payment ${paymentResult[0].invoiceNumber || paymentResult[0].id}`;
          
          // Notify related users (requester, approver)
          if (paymentResult[0].requestedById && paymentResult[0].requestedById !== user.id) {
            await createNotification(
              db,
              {
                userId: paymentResult[0].requestedById,
                type: 'DOCUMENT_UPLOADED',
                title: 'New Document Uploaded',
                message: notificationMessage,
                entityType,
                entityId,
              }
            );
          }
        }
      }
      
      // Invalidate cache
      await invalidateCacheByPattern(redis, 'documents:*');
      
      if (input.supplierId) {
        await redis.del(`supplier:${input.supplierId}`);
      }
      
      if (input.contractId) {
        await redis.del(`contract:${input.contractId}`);
      }
      
      if (input.paymentId) {
        await redis.del(`payment:${input.paymentId}`);
      }
      
      return newDocument;
    },
    
    // Delete a document
    deleteDocument: async (_: any, { id }: { id: string }, { user, db, req, redis }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Get document data
      const documentData = await db.select().from(documents).where(eq(documents.id, id));
      
      if (!documentData.length) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const document = documentData[0];
      
      // Check if user has permission to delete
      // Users can delete documents they uploaded, or if they're admin
      if (user.role !== 'ADMIN' && document.uploadedById !== user.id) {
        throw new GraphQLError('You do not have permission to delete this document', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      // Delete document
      await db.delete(documents).where(eq(documents.id, id));
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: 'DELETE',
          entityType: 'DOCUMENT',
          entityId: id,
          oldValues: document,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Invalidate cache
      await redis.del(`document:${id}`);
      await invalidateCacheByPattern(redis, 'documents:*');
      
      if (document.supplierId) {
        await redis.del(`supplier:${document.supplierId}`);
      }
      
      if (document.contractId) {
        await redis.del(`contract:${document.contractId}`);
      }
      
      if (document.paymentId) {
        await redis.del(`payment:${document.paymentId}`);
      }
      
      return true;
    },
  },
  
  // Field resolvers
  Document: {
    // Resolve supplier field
    supplier: async (parent: any, _: any, { db }: Context) => {
      if (!parent.supplierId) return null;
      
      const result = await db.select().from(suppliers).where(eq(suppliers.id, parent.supplierId));
      return result.length ? result[0] : null;
    },
    
    // Resolve contract field
    contract: async (parent: any, _: any, { db }: Context) => {
      if (!parent.contractId) return null;
      
      const result = await db.select().from(contracts).where(eq(contracts.id, parent.contractId));
      return result.length ? result[0] : null;
    },
    
    // Resolve payment field
    payment: async (parent: any, _: any, { db }: Context) => {
      if (!parent.paymentId) return null;
      
      const result = await db.select().from(payments).where(eq(payments.id, parent.paymentId));
      return result.length ? result[0] : null;
    },
    
    // Resolve uploadedBy field
    uploadedBy: async (parent: any, _: any, { db }: Context) => {
      if (!parent.uploadedById) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.uploadedById));
      return result.length ? result[0] : null;
    },
  },
};