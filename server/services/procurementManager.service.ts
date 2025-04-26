// server/services/procurementManager.service.ts
import { eq, and, sql } from 'drizzle-orm';
import { 
  users, 
  supplierCategories, 
  systemSettings,
  notificationSettings,
  notifications
} from '../db/schema';
import { createAuditLog } from './auditLog.service';

// Get all procurement specialists in a department
export async function getDepartmentSpecialists(db: any, department: string) {
  try {
    const specialists = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'PROCUREMENT_SPECIALIST'),
          eq(users.department, department),
          eq(users.isActive, true)
        )
      );
    
    return specialists;
  } catch (error) {
    console.error('Error getting department specialists:', error);
    throw error;
  }
}

// Set supplier evaluation criteria
export async function setSupplierEvaluationCriteria(
  db: any,
  managerId: string,
  criteria: {
    financialWeight: number;
    qualityWeight: number;
    deliveryWeight: number;
    communicationWeight: number;
    autoApproveThreshold?: number;
  },
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Verify the weights sum to 100
    const { financialWeight, qualityWeight, deliveryWeight, communicationWeight, autoApproveThreshold } = criteria;
    const totalWeight = financialWeight + qualityWeight + deliveryWeight + communicationWeight;

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Evaluation criteria weights must sum to 100%');
    }

    // Store the criteria as system settings
    const settings = [
      {
        key: 'supplier_eval_financial_weight',
        value: financialWeight.toString(),
        description: 'Weight for financial stability in supplier evaluation',
        dataType: 'number'
      },
      {
        key: 'supplier_eval_quality_weight',
        value: qualityWeight.toString(),
        description: 'Weight for quality in supplier evaluation',
        dataType: 'number'
      },
      {
        key: 'supplier_eval_delivery_weight',
        value: deliveryWeight.toString(),
        description: 'Weight for delivery in supplier evaluation',
        dataType: 'number'
      },
      {
        key: 'supplier_eval_communication_weight',
        value: communicationWeight.toString(),
        description: 'Weight for communication in supplier evaluation',
        dataType: 'number'
      }
    ];

    if (autoApproveThreshold !== undefined) {
      settings.push({
        key: 'supplier_eval_auto_approve_threshold',
        value: autoApproveThreshold.toString(),
        description: 'Overall rating threshold for auto-approving suppliers',
        dataType: 'number'
      });
    }

    // Update settings in database
    for (const setting of settings) {
      // Check if the setting already exists
      const existingSetting = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, setting.key));

      if (existingSetting.length) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            value: setting.value,
            updatedById: managerId,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.key, setting.key));
      } else {
        // Create new setting
        await db
          .insert(systemSettings)
          .values({
            ...setting,
            isPublic: false,
            updatedById: managerId
          });
      }
    }

    // Create audit log
    await createAuditLog(
      db,
      {
        userId: managerId,
        action: 'SET_EVALUATION_CRITERIA',
        entityType: 'SYSTEM_SETTING',
        entityId: 'supplier_evaluation',
        newValues: criteria,
        ipAddress,
        userAgent
      }
    );

    return true;
  } catch (error) {
    console.error('Error setting supplier evaluation criteria:', error);
    throw error;
  }
}

// Get current supplier evaluation criteria
export async function getSupplierEvaluationCriteria(db: any) {
  try {
    const keys = [
      'supplier_eval_financial_weight',
      'supplier_eval_quality_weight',
      'supplier_eval_delivery_weight',
      'supplier_eval_communication_weight',
      'supplier_eval_auto_approve_threshold'
    ];

    const settingsResult = await db
      .select()
      .from(systemSettings)
      .where(sql`${systemSettings.key} IN (${keys})`);

    // Convert to a structured object
    const criteria: any = {
      financialWeight: 25,
      qualityWeight: 25,
      deliveryWeight: 25,
      communicationWeight: 25
    };

    for (const setting of settingsResult) {
      if (setting.key === 'supplier_eval_financial_weight') {
        criteria.financialWeight = parseInt(setting.value);
      } else if (setting.key === 'supplier_eval_quality_weight') {
        criteria.qualityWeight = parseInt(setting.value);
      } else if (setting.key === 'supplier_eval_delivery_weight') {
        criteria.deliveryWeight = parseInt(setting.value);
      } else if (setting.key === 'supplier_eval_communication_weight') {
        criteria.communicationWeight = parseInt(setting.value);
      } else if (setting.key === 'supplier_eval_auto_approve_threshold') {
        criteria.autoApproveThreshold = parseInt(setting.value);
      }
    }

    return criteria;
  } catch (error) {
    console.error('Error getting supplier evaluation criteria:', error);
    throw error;
  }
}

// Set department notification settings
export async function setDepartmentNotifications(
  db: any,
  managerId: string,
  department: string,
  settings: {
    supplierCreated?: boolean;
    supplierApproved?: boolean;
    supplierRejected?: boolean;
    contractCreated?: boolean;
    contractApproved?: boolean;
    contractRejected?: boolean;
    paymentRequested?: boolean;
    paymentApproved?: boolean;
    paymentRejected?: boolean;
    documentUploaded?: boolean;
    contractExpiring?: boolean;
    emailNotifications?: boolean;
  },
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get all specialists in the department
    const specialists = await getDepartmentSpecialists(db, department);
    
    if (!specialists.length) {
      throw new Error(`No specialists found in department: ${department}`);
    }
    
    // Update notification settings for each specialist
    for (const specialist of specialists) {
      // Check if the specialist already has notification settings
      const existingSettings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, specialist.id));
      
      if (existingSettings.length) {
        // Update existing settings
        await db
          .update(notificationSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(notificationSettings.userId, specialist.id));
      } else {
        // Create new settings
        await db
          .insert(notificationSettings)
          .values({
            userId: specialist.id,
            ...settings
          });
      }
      
      // Create notification to inform the specialist
      await db
        .insert(notifications)
        .values({
          userId: specialist.id,
          type: 'SYSTEM',
          title: 'Notification Settings Updated',
          message: `Your notification settings have been updated by your department manager.`,
          entityType: 'NOTIFICATION_SETTINGS',
          entityId: specialist.id
        });
    }
    
    // Create audit log
    await createAuditLog(
      db,
      {
        userId: managerId,
        action: 'SET_DEPARTMENT_NOTIFICATIONS',
        entityType: 'NOTIFICATION_SETTINGS',
        entityId: department,
        newValues: { department, ...settings },
        ipAddress,
        userAgent
      }
    );
    
    return {
      success: true,
      affectedUsers: specialists.length,
      department
    };
  } catch (error) {
    console.error('Error setting department notifications:', error);
    throw error;
  }
}
