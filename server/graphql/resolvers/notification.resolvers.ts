import { eq, and, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { notifications, users } from '../../db/schema';
import { Context } from '../context';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notification.service';

export const notificationResolvers = {
  Query: {
    // Get paginated notifications for current user
    notifications: async (
      _: any,
      { pagination, isRead }: { pagination: { page: number; limit: number }; isRead?: boolean },
      { user, db }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;

      // Build query with optional isRead filter
      let query = db.select().from(notifications).where(eq(notifications.userId, user.id));

      if (isRead !== undefined) {
        query = query.where(eq(notifications.isRead, isRead));
      }

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(notifications)
        .where(eq(notifications.userId, user.id));

      const total = Number(countResult[0].count);

      // Execute paginated query with sorting by creation date (newest first)
      const result = await query
        .orderBy(sql`${notifications.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return {
        items: result,
        total,
        page,
        limit,
        hasMore: offset + result.length < total,
      };
    },

    // Get notification settings for current user
    notificationSettings: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Get notification settings for current user
      const result = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, user.id));

      // If no settings exist, create default settings
      if (!result.length) {
        const newSettings = await db
          .insert(notificationSettings)
          .values({ userId: user.id })
          .returning();

        return newSettings[0];
      }

      return result[0];
    },
  },

  Mutation: {
    // Mark a notification as read
    markNotificationAsRead: async (_: any, { id }: { id: string }, { user, db }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Get notification
      const notificationResult = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

      if (!notificationResult.length) {
        throw new GraphQLError('Notification not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Mark as read
      const result = await markNotificationAsRead(db, id, user.id);

      if (!result) {
        throw new GraphQLError('Failed to mark notification as read', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return result;
    },

    // Mark all notifications as read for current user
    markAllNotificationsAsRead: async (_: any, __: any, { user, db }: Context) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Mark all as read
      const result = await markAllNotificationsAsRead(db, user.id);

      if (!result) {
        throw new GraphQLError('Failed to mark all notifications as read', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return result;
    },

    // Update notification settings
    updateNotificationSettings: async (
      _: any,
      { input }: { input: any },
      { user, db }: Context
    ) => {
      // Check if user is authenticated
      if (!user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Get existing settings
      const existingSettings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, user.id));

      let result;

      // If settings exist, update them
      if (existingSettings.length) {
        result = await db
          .update(notificationSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.userId, user.id))
          .returning();
      } else {
        // If no settings exist, create new ones
        result = await db
          .insert(notificationSettings)
          .values({
            userId: user.id,
            ...input,
          })
          .returning();
      }

      return result[0];
    },
  },

  Subscription: {
    // Subscribe to new notifications
    notificationCreated: {
      subscribe: (_: any, __: any, { pubsub, user }: Context) => {
        // Check if user is authenticated
        if (!user) {
          throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        // Subscribe to notifications for this user
        return pubsub.asyncIterator([`NOTIFICATION_CREATED_${user.id}`]);
      },
    },
  },

  // Field resolvers
  Notification: {
    // Resolve user field
    user: async (parent: any, _: any, { db }: Context) => {
      const result = await db.select().from(users).where(eq(users.id, parent.userId));
      return result.length ? result[0] : null;
    },
  },
};
