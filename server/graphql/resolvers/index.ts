import { userResolvers } from './user.resolvers';
import { supplierCategoryResolvers } from './supplierCategory.resolvers';
import { supplierResolvers } from './supplier.resolvers';
import { contractResolvers } from './contract.resolvers';
import { paymentResolvers } from './payment.resolvers';
import { documentResolvers } from './document.resolvers';
import { auditLogResolvers } from './auditLog.resolvers';
import { notificationResolvers } from './notification.resolvers';
import { analyticsResolvers } from './analytics.resolvers';
import { systemSettingResolvers } from './systemSetting.resolvers';
import { permissionResolvers } from './permission.resolvers';
import { adminResolvers } from './admin.resolvers';
import { procurementManagerResolvers } from './procurementManager.resolvers';
import { procurementSpecialistResolvers } from './procurementSpecialist.resolvers';
import { supplierRegistrationResolvers } from './supplierRegistration.resolvers';

// Merge all resolvers
export const resolvers = [
  userResolvers,
  supplierCategoryResolvers,
  supplierResolvers,
  contractResolvers,
  paymentResolvers,
  documentResolvers,
  auditLogResolvers,
  notificationResolvers,
  analyticsResolvers,
  systemSettingResolvers,
  permissionResolvers,
  adminResolvers,
  procurementManagerResolvers,
  procurementSpecialistResolvers,
  supplierRegistrationResolvers
];