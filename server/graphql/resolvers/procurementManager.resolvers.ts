
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';
import {
  getSupplierEvaluationCriteria,
  setSupplierEvaluationCriteria,
  getDepartmentSpecialists,
  setDepartmentNotifications
} from '../../services/procurementManager.service';

export const procurementManagerResolvers = {
  Query: {
    // Get supplier evaluation criteria
    supplierEvaluationCriteria: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view evaluation criteria');
      
      return getSupplierEvaluationCriteria(db);
    },
    
    // Get specialists in department
    departmentSpecialists: async (
      _: any, 
      { department }: { department: string }, 
      { user, db }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'view department specialists');
      
      // If not admin, can only view own department
      if (user.role !== 'ADMIN' && (!user.department || user.department !== department)) {
        throw new GraphQLError('You can only view specialists in your own department', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      return getDepartmentSpecialists(db, department);
    },
  },
  
  Mutation: {
    // Set supplier evaluation criteria
    setSupplierEvaluationCriteria: async (
      _: any,
      { 
        input 
      }: { 
        input: { 
          financialWeight: number; 
          qualityWeight: number; 
          deliveryWeight: number; 
          communicationWeight: number; 
          autoApproveThreshold?: number;
        } 
      },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'set evaluation criteria');
      
      // Set the criteria
      await setSupplierEvaluationCriteria(
        db,
        user.id,
        input,
        req.ip,
        req.headers['user-agent']
      );
      
      return {
        success: true,
        message: 'Supplier evaluation criteria updated successfully',
      };
    },
    
    // Set department notification settings
    setDepartmentNotifications: async (
      _: any,
      { department, input }: { department: string; input: any },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN', 'PROCUREMENT_MANAGER'], 'set department notifications');
      
      // If not admin, can only set for own department
      if (user.role !== 'ADMIN' && (!user.department || user.department !== department)) {
        throw new GraphQLError('You can only set notifications for your own department', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      
      // Set the notification settings
      const result = await setDepartmentNotifications(
        db,
        user.id,
        department,
        input,
        req.ip,
        req.headers['user-agent']
      );
      
      return {
        success: true,
        message: `Updated notification settings for ${result.affectedUsers} specialists in the ${department} department`,
        affectedUsers: result.affectedUsers,
      };
    },
  }
};
