import { notifications, users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Interface for notification data
interface NotificationData {
  userId?: string;
  roleFilter?: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

// Create a notification for a specific user
export async function createNotification(db: any, data: NotificationData) {
  try {
    // If userId is provided, create notification for that user
    if (data.userId) {
      await db.insert(notifications).values({
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
      });
      
      return true;
    }
    
    // If roleFilter is provided, create notifications for all users with that role
    if (data.roleFilter) {
      const usersWithRole = await db.select().from(users).where(eq(users.role, data.roleFilter));
      
      if (usersWithRole.length > 0) {
        const notificationsToCreate = usersWithRole.map(user => ({
          userId: user.id,
          type: data.type as any,
          title: data.title,
          message: data.message,
          entityType: data.entityType,
          entityId: data.entityId,
        }));
        
        await db.insert(notifications).values(notificationsToCreate);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(db: any, id: string, userId: string) {
  try {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(db: any, userId: string) {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}