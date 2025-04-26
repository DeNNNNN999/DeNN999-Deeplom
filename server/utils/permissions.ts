import { GraphQLError } from 'graphql';
import { eq, and } from 'drizzle-orm';
import { permissions } from '../db/schema';


const roleHierarchy = {
  'ADMIN': 3,
  'PROCUREMENT_MANAGER': 2,
  'PROCUREMENT_SPECIALIST': 1,
};

// Permission checker based on role
export function checkPermission(userRole: string, allowedRoles: string[], action: string) {
  if (!allowedRoles.includes(userRole)) {
    throw new GraphQLError(`You do not have permission to ${action}`, {
      extensions: {
        code: 'FORBIDDEN',
        userRole,
        requiredRoles: allowedRoles,
      },
    });
  }
  return true;
}

// Role hierarchy checker (checks if user role is at least at the required level)
export function checkRoleLevel(userRole: string, requiredRole: string) {
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

// Entity ownership checker
export function checkOwnership<T extends { createdById?: string | null }>(
  entity: T | null,
  userId: string,
  userRole: string,
  action: string
) {
  // Missing entity
  if (!entity) {
    throw new GraphQLError('Entity not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  // Admin can access anything
  if (userRole === 'ADMIN') {
    return true;
  }

  // Check if the user created the entity
  const isCreator = entity.createdById === userId;

  // Procurement manager can access all entities
  if (userRole === 'PROCUREMENT_MANAGER') {
    return true;
  }

  // Procurement specialist can only access entities they created
  if (userRole === 'PROCUREMENT_SPECIALIST' && !isCreator) {
    throw new GraphQLError(`You do not have permission to ${action} this entity`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return true;
}

// Advanced permission checker based on database permissions
export async function checkDatabasePermission(
  db: any,
  userRole: string,
  resource: string,
  action: string,
  permissionDescription: string
) {
  // Admin can do anything without checking database permissions
  if (userRole === 'ADMIN') {
    return true;
  }

  // Query the permission from the database
  const result = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.role, userRole as any),
        eq(permissions.resource, resource),
        eq(permissions.action, action)
      )
    );

  // If permission exists and is granted, allow the action
  if (result.length && result[0].isGranted) {
    return true;
  }

  // Otherwise, deny access
  throw new GraphQLError(`You do not have permission to ${permissionDescription}`, {
    extensions: {
      code: 'FORBIDDEN',
      userRole,
      resource,
      action,
    },
  });
}

// Cache permissions for current user
const permissionCache = new Map<string, Map<string, boolean>>();

// Get cached permission or fetch from database
export async function hasPermission(
  db: any,
  redis: any,
  userRole: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Admin always has permission
  if (userRole === 'ADMIN') {
    return true;
  }

  // Generate cache key
  const cacheKey = `rolePermissionsMap:${userRole}`;

  // Try to get from local cache first
  const userPermissions = permissionCache.get(userRole);
  if (userPermissions) {
    const permKey = `${resource}:${action}`;
    if (userPermissions.has(permKey)) {
      return userPermissions.get(permKey) || false;
    }
  }

  // Try to get from Redis cache
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    const permissionsMap = JSON.parse(cachedData);

    // Update local cache
    const userPerms = new Map<string, boolean>();
    for (const res in permissionsMap) {
      for (const act in permissionsMap[res]) {
        userPerms.set(`${res}:${act}`, permissionsMap[res][act]);
      }
    }
    permissionCache.set(userRole, userPerms);

    // Return the permission if it exists
    return permissionsMap[resource]?.[action] || false;
  }

  // Fetch from database if not in cache
  const result = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.role, userRole as any),
        eq(permissions.resource, resource),
        eq(permissions.action, action)
      )
    );

  // If permission exists and is granted, allow the action
  const hasPermission = result.length > 0 && result[0].isGranted;

  // Cache the result for next time
  const userPerms = permissionCache.get(userRole) || new Map<string, boolean>();
  userPerms.set(`${resource}:${action}`, hasPermission);
  permissionCache.set(userRole, userPerms);

  return hasPermission;
}
