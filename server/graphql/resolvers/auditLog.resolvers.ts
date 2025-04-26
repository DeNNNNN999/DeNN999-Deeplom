import { eq, and, sql, desc, asc, or, like, between } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { auditLogs, users } from '../../db/schema';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';
import { sanitizeAuditData } from '../../services/auditLog.service';

export const auditLogResolvers = {
  Query: {
    // Get a single audit log entry by ID
    auditLog: async (_: any, { id }: { id: string }, { user, db }: Context) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins should be able to view audit logs
      checkPermission(user.role, ['ADMIN'], 'view audit logs');
      
      // Get audit log
      const result = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
      
      if (!result.length) {
        throw new GraphQLError('Audit log not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      // Sanitize sensitive data
      return sanitizeAuditData(result[0]);
    },
    
    // Get paginated audit logs with filtering options
    auditLogs: async (
      _: any,
      { 
        pagination, 
        filter 
      }: { 
        pagination: { page: number; limit: number }; 
        filter?: { 
          userId?: string;
          entityType?: string;
          entityId?: string;
          action?: string;
          dateFrom?: Date;
          dateTo?: Date;
        }; 
      },
      { user, db }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Only admins should be able to view audit logs
      checkPermission(user.role, ['ADMIN'], 'view audit logs');
      
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;
      
      // Build query with filters
      let query = db.select().from(auditLogs);
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(auditLogs);
      
      // Apply filters if provided
      if (filter) {
        const conditions = [];
        
        if (filter.userId) {
          conditions.push(eq(auditLogs.userId, filter.userId));
        }
        
        if (filter.entityType) {
          conditions.push(eq(auditLogs.entityType, filter.entityType));
        }
        
        if (filter.entityId) {
          conditions.push(eq(auditLogs.entityId, filter.entityId));
        }
        
        if (filter.action) {
          conditions.push(eq(auditLogs.action, filter.action));
        }
        
        if (filter.dateFrom && filter.dateTo) {
          conditions.push(
            between(
              auditLogs.createdAt,
              new Date(filter.dateFrom),
              new Date(filter.dateTo)
            )
          );
        } else if (filter.dateFrom) {
          conditions.push(sql`${auditLogs.createdAt} >= ${new Date(filter.dateFrom)}`);
        } else if (filter.dateTo) {
          conditions.push(sql`${auditLogs.createdAt} <= ${new Date(filter.dateTo)}`);
        }
        
        // Apply all conditions
        if (conditions.length > 0) {
          const whereCondition = and(...conditions);
          query = query.where(whereCondition);
          countQuery = countQuery.where(whereCondition);
        }
      }
      
      // Get total count for pagination
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      
      // Execute paginated query with sorting by creation date (newest first)
      const result = await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      // Sanitize sensitive data in audit logs
      const sanitizedItems = result.map(item => sanitizeAuditData(item));
      
      return {
        items: sanitizedItems,
        total,
        page,
        limit,
        hasMore: offset + result.length < total,
      };
    },
  },
  
  // Field resolvers
  AuditLog: {
    // Resolve user field
    user: async (parent: any, _: any, { db }: Context) => {
      if (!parent.userId) return null;
      
      const result = await db.select().from(users).where(eq(users.id, parent.userId));
      return result.length ? result[0] : null;
    },
    
    // Parse JSON values if needed
    oldValues: (parent: any) => {
      if (!parent.oldValues) return null;
      return typeof parent.oldValues === 'string' 
        ? JSON.parse(parent.oldValues) 
        : parent.oldValues;
    },
    
    newValues: (parent: any) => {
      if (!parent.newValues) return null;
      return typeof parent.newValues === 'string' 
        ? JSON.parse(parent.newValues) 
        : parent.newValues;
    },
  },
};