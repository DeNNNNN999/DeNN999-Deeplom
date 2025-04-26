import { pgTable, serial, text, timestamp, boolean, uuid, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST']);

export const supplierStatusEnum = pgEnum('supplier_status', ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE']);

export const contractStatusEnum = pgEnum('contract_status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED']);

export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'APPROVED', 'PAID', 'REJECTED']);

export const notificationTypeEnum = pgEnum('notification_type', ['SUPPLIER_CREATED', 'SUPPLIER_APPROVED', 'SUPPLIER_REJECTED', 'CONTRACT_CREATED', 'CONTRACT_APPROVED', 'CONTRACT_REJECTED', 'PAYMENT_REQUESTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'DOCUMENT_UPLOADED', 'CONTRACT_EXPIRING']);

// Tables
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('PROCUREMENT_SPECIALIST'),
  department: text('department'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  supplierCreated: many(suppliers, { relationName: 'createdBy' }),
  supplierUpdated: many(suppliers, { relationName: 'updatedBy' }),
  supplierApproved: many(suppliers, { relationName: 'approvedBy' }),
  contractsCreated: many(contracts, { relationName: 'contractCreatedBy' }),
  contractsApproved: many(contracts, { relationName: 'contractApprovedBy' }),
  paymentsRequested: many(payments, { relationName: 'paymentRequestedBy' }),
  paymentsApproved: many(payments, { relationName: 'paymentApprovedBy' }),
  documents: many(documents),
}));

export const supplierCategories = pgTable('supplier_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
});

export const supplierCategoriesRelations = relations(supplierCategories, ({ many }) => ({
  suppliers: many(supplierCategoryMap),
}));

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  legalName: text('legal_name').notNull(),
  taxId: text('tax_id').notNull().unique(),
  registrationNumber: text('registration_number').notNull().unique(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state'),
  country: text('country').notNull(),
  postalCode: text('postal_code').notNull(),
  phoneNumber: text('phone_number').notNull(),
  email: text('email').notNull(),
  website: text('website'),
  status: supplierStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  financialStability: integer('financial_stability'),
  qualityRating: integer('quality_rating'),
  deliveryRating: integer('delivery_rating'),
  communicationRating: integer('communication_rating'),
  overallRating: integer('overall_rating'),
  bankAccountInfo: jsonb('bank_account_info'),
  contactPersonName: text('contact_person_name'),
  contactPersonEmail: text('contact_person_email'),
  contactPersonPhone: text('contact_person_phone'),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  updatedById: uuid('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedById: uuid('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supplierRelations = relations(suppliers, ({ many, one }) => ({
  categories: many(supplierCategoryMap),
  contracts: many(contracts),
  documents: many(documents),
  payments: many(payments),
  createdBy: one(users, {
    fields: [suppliers.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  updatedBy: one(users, {
    fields: [suppliers.updatedById],
    references: [users.id],
    relationName: 'updatedBy',
  }),
  approvedBy: one(users, {
    fields: [suppliers.approvedById],
    references: [users.id],
    relationName: 'approvedBy',
  }),
}));

export const supplierCategoryMap = pgTable('supplier_category_map', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => supplierCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const supplierCategoryMapRelations = relations(supplierCategoryMap, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierCategoryMap.supplierId],
    references: [suppliers.id],
  }),
  category: one(supplierCategories, {
    fields: [supplierCategoryMap.categoryId],
    references: [supplierCategories.id],
  }),
}));

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  contractNumber: text('contract_number').notNull().unique(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  value: integer('value').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: contractStatusEnum('status').notNull().default('DRAFT'),
  terms: text('terms'),
  paymentTerms: text('payment_terms'),
  deliveryTerms: text('delivery_terms'),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedById: uuid('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [contracts.supplierId],
    references: [suppliers.id],
  }),
  createdBy: one(users, {
    fields: [contracts.createdById],
    references: [users.id],
    relationName: 'contractCreatedBy',
  }),
  approvedBy: one(users, {
    fields: [contracts.approvedById],
    references: [users.id],
    relationName: 'contractApprovedBy',
  }),
  documents: many(documents),
  payments: many(payments),
}));

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  description: text('description'),
  invoiceNumber: text('invoice_number'),
  invoiceDate: timestamp('invoice_date'),
  dueDate: timestamp('due_date'),
  paymentDate: timestamp('payment_date'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  requestedById: uuid('requested_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedById: uuid('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [payments.supplierId],
    references: [suppliers.id],
  }),
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
  requestedBy: one(users, {
    fields: [payments.requestedById],
    references: [users.id],
    relationName: 'paymentRequestedBy',
  }),
  approvedBy: one(users, {
    fields: [payments.approvedById],
    references: [users.id],
    relationName: 'paymentApprovedBy',
  }),
  documents: many(documents),
}));

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(),
  description: text('description'),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'cascade' }),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'cascade' }),
  uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [documents.supplierId],
    references: [suppliers.id],
  }),
  contract: one(contracts, {
    fields: [documents.contractId],
    references: [contracts.id],
  }),
  payment: one(payments, {
    fields: [documents.paymentId],
    references: [payments.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  supplierCreated: boolean('supplier_created').notNull().default(true),
  supplierApproved: boolean('supplier_approved').notNull().default(true),
  supplierRejected: boolean('supplier_rejected').notNull().default(true),
  contractCreated: boolean('contract_created').notNull().default(true),
  contractApproved: boolean('contract_approved').notNull().default(true),
  contractRejected: boolean('contract_rejected').notNull().default(true),
  paymentRequested: boolean('payment_requested').notNull().default(true),
  paymentApproved: boolean('payment_approved').notNull().default(true),
  paymentRejected: boolean('payment_rejected').notNull().default(true),
  documentUploaded: boolean('document_uploaded').notNull().default(true),
  contractExpiring: boolean('contract_expiring').notNull().default(true),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  inAppNotifications: boolean('in_app_notifications').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

// System settings table for administrators
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  dataType: text('data_type').notNull().default('string'), // string, number, boolean, json
  isPublic: boolean('is_public').notNull().default(false), // Whether the setting is visible to non-admin users
  updatedById: uuid('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [systemSettings.updatedById],
    references: [users.id],
  }),
}));

// Role permissions table for detailed access control
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: userRoleEnum('role').notNull(),
  resource: text('resource').notNull(), // entity or feature name like 'supplier', 'contract', etc.
  action: text('action').notNull(), // 'create', 'read', 'update', 'delete', 'approve', etc.
  description: text('description'),
  isGranted: boolean('is_granted').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Create a unique constraint for role-resource-action combination
// This is needed to ensure there are no duplicate permission entries
export const rolePermissionsIndexes = {
  roleResourceActionIdx: {
    name: 'role_resource_action_unique',
    columns: ['role', 'resource', 'action'],
    unique: true,
  },
};