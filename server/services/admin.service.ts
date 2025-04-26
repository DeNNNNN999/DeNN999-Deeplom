import { eq, sql } from 'drizzle-orm';
import {
  users,
  auditLogs,
  systemSettings,
  permissions,
  userRoleEnum
} from '../db/schema';
import { createAuditLog } from './auditLog.service';

// Service functions for admin operations

// Get system statistics for admin dashboard
export async function getSystemStatistics(db: any) {
  try {
    // Get user statistics
    const userStats = await db.select({
      totalUsers: sql`COUNT(*)`,
      activeUsers: sql`SUM(CASE WHEN ${users.isActive} = true THEN 1 ELSE 0 END)`,
      admins: sql`SUM(CASE WHEN ${users.role} = 'ADMIN' THEN 1 ELSE 0 END)`,
      managers: sql`SUM(CASE WHEN ${users.role} = 'PROCUREMENT_MANAGER' THEN 1 ELSE 0 END)`,
      specialists: sql`SUM(CASE WHEN ${users.role} = 'PROCUREMENT_SPECIALIST' THEN 1 ELSE 0 END)`,
    }).from(users);

    // Get audit log statistics
    const auditStats = await db.select({
      totalLogs: sql`COUNT(*)`,
      lastDay: sql`SUM(CASE WHEN ${auditLogs.createdAt} > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END)`,
      lastWeek: sql`SUM(CASE WHEN ${auditLogs.createdAt} > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)`,
      lastMonth: sql`SUM(CASE WHEN ${auditLogs.createdAt} > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)`,
    }).from(auditLogs);

    // Get permission statistics
    const permStats = await db.select({
      totalPerms: sql`COUNT(*)`,
      granted: sql`SUM(CASE WHEN ${permissions.isGranted} = true THEN 1 ELSE 0 END)`,
      denied: sql`SUM(CASE WHEN ${permissions.isGranted} = false THEN 1 ELSE 0 END)`,
    }).from(permissions);

    // Get settings statistics
    const settingStats = await db.select({
      totalSettings: sql`COUNT(*)`,
      publicSettings: sql`SUM(CASE WHEN ${systemSettings.isPublic} = true THEN 1 ELSE 0 END)`,
    }).from(systemSettings);

    // Combine all statistics
    return {
      users: userStats[0],
      auditLogs: auditStats[0],
      permissions: permStats[0],
      settings: settingStats[0],
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error getting system statistics:', error);
    throw error;
  }
}

// Reset user password (admin function)
export async function resetUserPassword(
  db: any,
  adminId: string,
  targetUserId: string,
  newPasswordHash: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get user data before update for audit log
    const userData = await db.select().from(users).where(eq(users.id, targetUserId));
    
    if (!userData.length) {
      throw new Error('User not found');
    }
    
    // Reset password
    const result = await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning();
    
    // Create audit log
    await createAuditLog(
      db,
      {
        userId: adminId,
        action: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: targetUserId,
        ipAddress,
        userAgent,
      }
    );
    
    return result[0];
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
}

// Change user role (admin function)
export async function changeUserRole(
  db: any,
  adminId: string,
  targetUserId: string,
  newRole: userRoleEnum,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get user data before update for audit log
    const userData = await db.select().from(users).where(eq(users.id, targetUserId));
    
    if (!userData.length) {
      throw new Error('User not found');
    }
    
    const oldRole = userData[0].role;
    
    // Change role
    const result = await db.update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning();
    
    // Create audit log
    await createAuditLog(
      db,
      {
        userId: adminId,
        action: 'CHANGE_ROLE',
        entityType: 'USER',
        entityId: targetUserId,
        oldValues: { role: oldRole },
        newValues: { role: newRole },
        ipAddress,
        userAgent,
      }
    );
    
    return result[0];
  } catch (error) {
    console.error('Error changing user role:', error);
    throw error;
  }
}

// Export database statistics (admin function)
export async function getDatabaseStatistics(db: any) {
  try {
    const statistics = await db.execute(sql`
      WITH 
        table_stats AS (
          SELECT
            relname as table_name,
            pg_stat_get_live_tuples(c.oid) as row_count,
            pg_total_relation_size(c.oid) as total_size_bytes
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE 
            c.relkind = 'r' 
            AND n.nspname = 'public'
        )
      SELECT
        table_name,
        row_count,
        total_size_bytes,
        pg_size_pretty(total_size_bytes) as total_size
      FROM table_stats
      ORDER BY total_size_bytes DESC;
    `);
    
    return statistics.rows;
  } catch (error) {
    console.error('Error getting database statistics:', error);
    throw error;
  }
}

// Get system backup configuration
export async function getBackupSettings(db: any) {
  try {
    const backupSettings = await db.select()
      .from(systemSettings)
      .where(
        sql`${systemSettings.key} LIKE 'backup_%'`
      );
    
    // Convert to a key-value object
    const settings: Record<string, any> = {};
    backupSettings.forEach((setting: any) => {
      // Convert values to appropriate types based on the dataType
      let value: any = setting.value;
      
      if (setting.dataType === 'number') {
        value = Number(value);
      } else if (setting.dataType === 'boolean') {
        value = value === 'true';
      } else if (setting.dataType === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse JSON value for ${setting.key}:`, e);
        }
      }
      
      settings[setting.key] = value;
    });
    
    return settings;
  } catch (error) {
    console.error('Error getting backup settings:', error);
    throw error;
  }
}