import { sql, eq, and, between, desc, count } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { suppliers, contracts, payments, supplierCategories, supplierCategoryMap } from '../../db/schema';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const analyticsResolvers = {
  Query: {
    // Get summary analytics for dashboard
    analyticsSummary: async (_: any, __: any, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('analyticsSummary');
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get total suppliers
      const suppliersResult = await db.select({
        total: sql`COUNT(*)`,
        pending: sql`SUM(CASE WHEN ${suppliers.status} = 'PENDING' THEN 1 ELSE 0 END)`,
        approved: sql`SUM(CASE WHEN ${suppliers.status} = 'APPROVED' THEN 1 ELSE 0 END)`,
        rejected: sql`SUM(CASE WHEN ${suppliers.status} = 'REJECTED' THEN 1 ELSE 0 END)`,
      }).from(suppliers);
      
      // Get contracts data
      const contractsResult = await db.select({
        total: sql`COUNT(*)`,
        active: sql`SUM(CASE WHEN ${contracts.status} = 'ACTIVE' THEN 1 ELSE 0 END)`,
        expiring: sql`SUM(CASE WHEN ${contracts.status} = 'ACTIVE' AND ${contracts.endDate} <= (NOW() + INTERVAL '30 day') THEN 1 ELSE 0 END)`,
      }).from(contracts);
      
      // Get payments data
      const paymentsResult = await db.select({
        totalAmount: sql`SUM(${payments.amount})`,
        pendingAmount: sql`SUM(CASE WHEN ${payments.status} = 'PENDING' THEN ${payments.amount} ELSE 0 END)`,
      }).from(payments);
      
      const summary = {
        totalSuppliers: Number(suppliersResult[0].total) || 0,
        pendingSuppliers: Number(suppliersResult[0].pending) || 0,
        approvedSuppliers: Number(suppliersResult[0].approved) || 0,
        rejectedSuppliers: Number(suppliersResult[0].rejected) || 0,
        totalContracts: Number(contractsResult[0].total) || 0,
        activeContracts: Number(contractsResult[0].active) || 0,
        expiringContracts: Number(contractsResult[0].expiring) || 0,
        totalPaymentsAmount: Number(paymentsResult[0].totalAmount) || 0,
        pendingPaymentsAmount: Number(paymentsResult[0].pendingAmount) || 0,
      };
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(summary), { EX: 3600 }); // Cache for 1 hour
      
      return summary;
    },
    
    // Get suppliers grouped by country
    suppliersByCountry: async (_: any, __: any, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Management or admin level access required
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view analytics');
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('suppliersByCountry');
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get suppliers grouped by country
      const result = await db.select({
        country: suppliers.country,
        count: sql`COUNT(*)`,
      })
      .from(suppliers)
      .where(eq(suppliers.status, 'APPROVED'))
      .groupBy(suppliers.country)
      .orderBy(sql`COUNT(*)`, desc(suppliers.country));
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result), { EX: 3600 }); // Cache for 1 hour
      
      return result;
    },
    
    // Get suppliers grouped by category
    suppliersByCategory: async (_: any, __: any, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Management or admin level access required
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view analytics');
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('suppliersByCategory');
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get suppliers grouped by category
      const result = await db.select({
        category: supplierCategories.name,
        count: sql`COUNT(DISTINCT ${supplierCategoryMap.supplierId})`,
      })
      .from(supplierCategoryMap)
      .innerJoin(supplierCategories, eq(supplierCategoryMap.categoryId, supplierCategories.id))
      .innerJoin(suppliers, eq(supplierCategoryMap.supplierId, suppliers.id))
      .where(eq(suppliers.status, 'APPROVED'))
      .groupBy(supplierCategories.name)
      .orderBy(sql`COUNT(DISTINCT ${supplierCategoryMap.supplierId})`, desc(supplierCategories.name));
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result), { EX: 3600 }); // Cache for 1 hour
      
      return result;
    },
    
    // Get contracts grouped by status
    contractsByStatus: async (_: any, __: any, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Management or admin level access required
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view analytics');
      
      // Try to get from cache first
      const cacheKeyName = cacheKey('contractsByStatus');
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Get contracts grouped by status
      const result = await db.select({
        status: contracts.status,
        count: sql`COUNT(*)`,
        value: sql`SUM(${contracts.value})`,
      })
      .from(contracts)
      .groupBy(contracts.status);
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(result), { EX: 3600 }); // Cache for 1 hour
      
      return result;
    },
    
    // Get payments by month for a given period
    paymentsByMonth: async (_: any, { months = 6 }: { months: number }, { user, db, redis, cacheKey }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      // Management or admin level access required
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view analytics');
      
      // Validate months parameter
      if (months <= 0 || months > 24) {
        throw new GraphQLError('Months must be between 1 and 24', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Try to get from cache first
      const cacheKeyName = cacheKey(`paymentsByMonth:${months}`);
      const cachedData = await redis.get(cacheKeyName);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // Set up date range
      const today = new Date();
      const startDate = startOfMonth(subMonths(today, months - 1));
      const endDate = endOfMonth(today);
      
      // Get payments grouped by month
      const result = await db.select({
        month: sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
        amount: sql`SUM(${payments.amount})`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'PAID'),
          between(payments.createdAt, startDate, endDate)
        )
      )
      .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);
      
      // Fill in missing months with zero values
      const filledResult = [];
      let currentDate = startDate;
      
      while (currentDate <= endDate) {
        const monthKey = format(currentDate, 'yyyy-MM');
        const existingEntry = result.find(entry => entry.month === monthKey);
        
        filledResult.push({
          month: monthKey,
          amount: existingEntry ? Number(existingEntry.amount) : 0,
        });
        
        currentDate = startOfMonth(subMonths(currentDate, -1)); // Add 1 month
      }
      
      // Cache the result
      await redis.set(cacheKeyName, JSON.stringify(filledResult), { EX: 3600 }); // Cache for 1 hour
      
      return filledResult;
    },
  },
};