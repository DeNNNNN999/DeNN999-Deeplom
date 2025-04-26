import { GraphQLError } from 'graphql';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { Context } from '../context';
import { checkPermission } from '../../utils/permissions';
import { 
  getSystemStatistics, 
  resetUserPassword, 
  changeUserRole, 
  getDatabaseStatistics,
  getBackupSettings
} from '../../services/admin.service';
import { createAuditLog } from '../../services/auditLog.service';

export const adminResolvers = {
  Query: {
    // Get system statistics for admin dashboard
    systemStatistics: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'view system statistics');
      
      // Get system statistics
      return getSystemStatistics(db);
    },
    
    // Get database statistics
    databaseStatistics: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'view database statistics');
      
      // Get database statistics
      return getDatabaseStatistics(db);
    },
    
    // Get backup settings
    backupSettings: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'view backup settings');
      
      // Get backup settings
      return getBackupSettings(db);
    },
  },
  
  Mutation: {
    // Reset user password (admin only)
    resetUserPassword: async (
      _: any,
      { userId, newPassword }: { userId: string; newPassword: string },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'reset user passwords');
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Reset the user's password
      const updatedUser = await resetUserPassword(
        db,
        user.id,
        userId,
        passwordHash,
        req.ip,
        req.headers['user-agent']
      );
      
      // Return success
      return {
        success: true,
        message: `Password for user ${updatedUser.email} has been reset successfully.`,
      };
    },
    
    // Change user role (admin only)
    changeUserRole: async (
      _: any,
      { userId, newRole }: { userId: string; newRole: string },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'change user roles');
      
      // Cannot change own role
      if (userId === user.id) {
        throw new GraphQLError('You cannot change your own role', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Check if the role is valid
      if (!['ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST'].includes(newRole)) {
        throw new GraphQLError('Invalid role', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Change the user's role
      const updatedUser = await changeUserRole(
        db,
        user.id,
        userId,
        newRole as any,
        req.ip,
        req.headers['user-agent']
      );
      
      // Return success
      return {
        success: true,
        message: `Role for user ${updatedUser.email} has been changed to ${newRole}.`,
      };
    },
    
    // Enable or disable a user account (admin only)
    toggleUserStatus: async (
      _: any,
      { userId, isActive }: { userId: string; isActive: boolean },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'toggle user status');
      
      // Cannot disable own account
      if (userId === user.id) {
        throw new GraphQLError('You cannot change your own account status', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      
      // Get current user data for audit log
      const userData = await db.select().from(users).where(eq(users.id, userId));
      
      if (!userData.length) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      const currentUser = userData[0];
      
      // Update user status
      const result = await db.update(users)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      const updatedUser = result[0];
      
      // Create audit log
      await createAuditLog(
        db,
        {
          userId: user.id,
          action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          entityType: 'USER',
          entityId: userId,
          oldValues: { isActive: currentUser.isActive },
          newValues: { isActive },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      
      // Return success
      return {
        success: true,
        message: `User ${updatedUser.email} has been ${isActive ? 'activated' : 'deactivated'}.`,
      };
    },
    
    // Configure backup settings (admin only)
    configureBackupSettings: async (
      _: any,
      { settings }: { settings: any },
      { user, db, req }: Context
    ) => {
      // Check if user is authenticated and has admin permission
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      
      checkPermission(user.role, ['ADMIN'], 'configure backup settings');
      
      try {
        // Update backup settings
        for (const [key, value] of Object.entries(settings)) {
          // Make sure the key has the backup_ prefix
          const settingKey = key.startsWith('backup_') ? key : `backup_${key}`;
          
          // Determine the data type
          let dataType = 'string';
          let stringValue = '';
          
          if (typeof value === 'number') {
            dataType = 'number';
            stringValue = value.toString();
          } else if (typeof value === 'boolean') {
            dataType = 'boolean';
            stringValue = value ? 'true' : 'false';
          } else if (typeof value === 'object') {
            dataType = 'json';
            stringValue = JSON.stringify(value);
          } else {
            stringValue = value as string;
          }
          
          // Check if the setting already exists
          const existingSetting = await db.query.systemSettings.findFirst({
            where: eq(db.systemSettings.key, settingKey),
          });
          
          if (existingSetting) {
            // Update the existing setting
            await db.update(db.systemSettings)
              .set({
                value: stringValue,
                dataType,
                updatedById: user.id,
                updatedAt: new Date(),
              })
              .where(eq(db.systemSettings.key, settingKey));
          } else {
            // Create a new setting
            await db.insert(db.systemSettings).values({
              key: settingKey,
              value: stringValue,
              description: `Backup setting: ${key}`,
              dataType,
              isPublic: false,
              updatedById: user.id,
            });
          }
          
          // Create audit log
          await createAuditLog(
            db,
            {
              userId: user.id,
              action: 'CONFIGURE_BACKUP',
              entityType: 'SYSTEM_SETTING',
              entityId: settingKey,
              newValues: { [key]: value },
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            }
          );
        }
        
        return {
          success: true,
          message: 'Backup settings configured successfully.',
        };
      } catch (error) {
        console.error('Error configuring backup settings:', error);
        throw new GraphQLError('Failed to configure backup settings', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};