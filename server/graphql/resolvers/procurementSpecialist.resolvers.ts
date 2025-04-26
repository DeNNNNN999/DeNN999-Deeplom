
import { GraphQLError } from 'graphql';
import { eq, and, or, lt, between, sql } from 'drizzle-orm';
import { contracts } from '../../db/schema';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';

export const procurementSpecialistResolvers = {
  Query: {
    // Get contracts that are expiring soon (within X days)
    expiringContracts: async (
      _: any,
      { daysThreshold = 30, pagination }: { daysThreshold: number; pagination: { page: number; limit: number } },
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
      
      // Calculate the date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      
      // Generate cache key based on query parameters
      const cacheKeyName = cacheKey(`expiringContracts:${daysThreshold}:${page}:${limit}:${user.id}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get contracts that are active and expiring within the threshold
      // For specialists, only show contracts they created unless they're an admin/manager
      let query = db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            lt(contracts.endDate, thresholdDate),
            or(
              user.role === 'ADMIN',
              user.role === 'PROCUREMENT_MANAGER',
              eq(contracts.createdById, user.id)
            )
          )
        );
      
      // Get total count for pagination
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            lt(contracts.endDate, thresholdDate),
            or(
              user.role === 'ADMIN',
              user.role === 'PROCUREMENT_MANAGER',
              eq(contracts.createdById, user.id)
            )
          )
        );
      
      const total = Number(countResult[0].count);
      
      // Execute paginated query with sorting (closest to expiration first)
      const result = await query
        .orderBy(contracts.endDate)
        .limit(limit)
        .offset(offset);
      
      // Enrich with supplier data
      const contractsWithSuppliers = await Promise.all(
        result.map(async (contract) => {
          const supplierResult = await db
            .select()
            .from(db.suppliers)
            .where(eq(db.suppliers.id, contract.supplierId));
          
          return {
            ...contract,
            supplier: supplierResult[0],
            daysRemaining: Math.ceil(
              (new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          };
        })
      );
      
      const response = {
        items: contractsWithSuppliers,
        total,
        page,
        limit,
        hasMore: offset + result.length < total,
      };
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(response), { EX: 300 }); // Cache for 5 minutes
      
      return response;
    },
    
    // Get contract expiration summary for dashboard
    contractExpirationSummary: async (_: any, __: any, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Generate cache key
      const cacheKeyName = cacheKey(`contractExpirationSummary:${user.id}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Calculate date thresholds
      const today = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(today.getDate() + 30);
      const ninetyDays = new Date();
      ninetyDays.setDate(today.getDate() + 90);
      
      // Build base query condition based on user role
      const userCondition = user.role === 'ADMIN' || user.role === 'PROCUREMENT_MANAGER'
        ? sql`1=1`
        : eq(contracts.createdById, user.id);
      
      // Get expiring in 30 days
      const expiring30Result = await db
        .select({ count: sql`COUNT(*)` })
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            between(contracts.endDate, today, thirtyDays),
            userCondition
          )
        );
      
      // Get expiring in 31-90 days
      const expiring90Result = await db
        .select({ count: sql`COUNT(*)` })
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            between(contracts.endDate, thirtyDays, ninetyDays),
            userCondition
          )
        );
      
      // Get expired contracts
      const expiredResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            lt(contracts.endDate, today),
            userCondition
          )
        );
      
      // Get highest value expiring contract
      const highValueResult = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'ACTIVE'),
            lt(contracts.endDate, thirtyDays),
            userCondition
          )
        )
        .orderBy(sql`${contracts.value} DESC`)
        .limit(1);
      
      const summary = {
        expiringSoon: Number(expiring30Result[0].count),
        expiringLater: Number(expiring90Result[0].count),
        expired: Number(expiredResult[0].count),
        highValueContract: highValueResult.length > 0 ? highValueResult[0] : null,
      };
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(summary), { EX: 600 }); // Cache for 10 minutes
      
      return summary;
    },
  }
};
