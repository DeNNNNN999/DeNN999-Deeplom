import { auditLogs } from '../db/schema';

// Interface for audit log data
interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Create audit log
export async function createAuditLog(db: any, data: AuditLogData) {
  try {
    // Create audit log entry
    const result = await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }).returning();
    
    return result[0];
  } catch (error) {
    console.error('Error creating audit log:', error);
    // We don't throw here to prevent audit log failures from breaking business operations
    return null;
  }
}

// Function to sanitize sensitive data from audit logs
export function sanitizeAuditData(data: any) {
  if (!data) return data;
  
  const sanitized = { ...data };
  
  // List of fields to mask in audit logs
  const sensitiveFields = [
    'passwordHash',
    'password',
    'secret',
    'token',
    'creditCard',
    'bankAccountNumber',
    'iban',
    'ssn',
  ];
  
  // Recursive function to mask sensitive fields
  function maskSensitiveData(obj: any) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => maskSensitiveData(item));
    }
    
    const maskedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (sensitiveFields.includes(key)) {
          maskedObj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskedObj[key] = maskSensitiveData(obj[key]);
        } else {
          maskedObj[key] = obj[key];
        }
      }
    }
    return maskedObj;
  }
  
  // Mask sensitive data in old and new values
  if (sanitized.oldValues) {
    sanitized.oldValues = maskSensitiveData(sanitized.oldValues);
  }
  
  if (sanitized.newValues) {
    sanitized.newValues = maskSensitiveData(sanitized.newValues);
  }
  
  return sanitized;
}