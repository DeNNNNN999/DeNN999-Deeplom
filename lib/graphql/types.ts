// Типы пользователей
export enum UserRole {
  ADMIN = 'ADMIN',
  PROCUREMENT_MANAGER = 'PROCUREMENT_MANAGER',
  PROCUREMENT_SPECIALIST = 'PROCUREMENT_SPECIALIST'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface UserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
}

export interface UserUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface AuthPayload {
  token: string;
  user: User;
}

// Типы поставщиков
export enum SupplierStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INACTIVE = 'INACTIVE'
}

export interface SupplierCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface Supplier {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  registrationNumber: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string;
  status: SupplierStatus;
  notes?: string;
  financialStability?: number;
  qualityRating?: number;
  deliveryRating?: number;
  communicationRating?: number;
  overallRating?: number;
  bankAccountInfo?: any;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  categories?: SupplierCategory[];
  createdBy?: User;
  updatedBy?: User;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierCategoryInput {
  name: string;
  description?: string;
}

export interface SupplierInput {
  name: string;
  legalName: string;
  taxId: string;
  registrationNumber: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string;
  notes?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  categoryIds?: string[];
  bankAccountInfo?: any;
}

export interface SupplierUpdateInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  notes?: string;
  status?: SupplierStatus;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  categoryIds?: string[];
  bankAccountInfo?: any;
}

export interface SupplierRegistrationInput {
  name: string;
  legalName: string;
  taxId: string;
  registrationNumber: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string;
  description?: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  categoryIds: string[];
}

export interface SupplierRatingInput {
  supplierId: string;
  financialStability?: number;
  qualityRating?: number;
  deliveryRating?: number;
  communicationRating?: number;
  overallRating?: number;
}

export interface SupplierRegistrationResult {
  success: boolean;
  message: string;
  supplier?: Supplier;
}

// Типы контрактов
export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

export interface Contract {
  id: string;
  title: string;
  supplier: Supplier;
  contractNumber: string;
  description?: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: ContractStatus;
  terms?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  createdBy?: User;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  daysRemaining?: number;
}

export interface ContractInput {
  title: string;
  supplierId: string;
  contractNumber: string;
  description?: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  terms?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
}

export interface ContractUpdateInput {
  title?: string;
  contractNumber?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  currency?: string;
  status?: ContractStatus;
  terms?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
}

export interface ContractExpirationSummary {
  expiringSoon: number;
  expiringLater: number;
  expired: number;
  highValueContract?: Contract;
}

// Типы платежей
export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED'
}

export interface Payment {
  id: string;
  supplier: Supplier;
  contract?: Contract;
  amount: number;
  currency: string;
  description?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentDate?: string;
  status: PaymentStatus;
  notes?: string;
  requestedBy?: User;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
}

export interface PaymentInput {
  supplierId: string;
  contractId?: string;
  amount: number;
  currency: string;
  description?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
}

export interface PaymentUpdateInput {
  amount?: number;
  currency?: string;
  description?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentDate?: string;
  status?: PaymentStatus;
  notes?: string;
}

// Типы документов
export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  description?: string;
  supplier?: Supplier;
  contract?: Contract;
  payment?: Payment;
  uploadedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentInput {
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  description?: string;
  supplierId?: string;
  contractId?: string;
  paymentId?: string;
}

// Типы уведомлений
export enum NotificationType {
  SUPPLIER_CREATED = 'SUPPLIER_CREATED',
  SUPPLIER_APPROVED = 'SUPPLIER_APPROVED',
  SUPPLIER_REJECTED = 'SUPPLIER_REJECTED',
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_APPROVED = 'CONTRACT_APPROVED',
  CONTRACT_REJECTED = 'CONTRACT_REJECTED',
  PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  CONTRACT_EXPIRING = 'CONTRACT_EXPIRING',
  SYSTEM = 'SYSTEM'
}

export interface Notification {
  id: string;
  user: User;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface NotificationSettings {
  id: string;
  user: User;
  supplierCreated: boolean;
  supplierApproved: boolean;
  supplierRejected: boolean;
  contractCreated: boolean;
  contractApproved: boolean;
  contractRejected: boolean;
  paymentRequested: boolean;
  paymentApproved: boolean;
  paymentRejected: boolean;
  documentUploaded: boolean;
  contractExpiring: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettingsInput {
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
  inAppNotifications?: boolean;
}

// Типы журнала аудита
export interface AuditLog {
  id: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogFilterInput {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Типы системных настроек
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  dataType: string;
  isPublic: boolean;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingInput {
  key: string;
  value: string;
  description?: string;
  dataType?: string;
  isPublic?: boolean;
}

export interface SystemSettingUpdateInput {
  value: string;
  description?: string;
  dataType?: string;
  isPublic?: boolean;
}

// Типы разрешений
export interface Permission {
  id: string;
  role: UserRole;
  resource: string;
  action: string;
  description?: string;
  isGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionInput {
  role: UserRole;
  resource: string;
  action: string;
  description?: string;
  isGranted: boolean;
}

export interface PermissionUpdateInput {
  isGranted: boolean;
  description?: string;
}

// Типы для бэкапов
export interface BackupSettings {
  backup_enabled?: boolean;
  backup_frequency?: string;
  backup_retention_days?: number;
  backup_storage_location?: string;
  backup_email_notification?: boolean;
  backup_notification_email?: string;
}

// Типы для результатов административных действий
export interface AdminActionResult {
  success: boolean;
  message: string;
}

// Типы для настроек оценки поставщиков
export interface SupplierEvaluationCriteria {
  financialWeight: number;
  qualityWeight: number;
  deliveryWeight: number;
  communicationWeight: number;
  autoApproveThreshold?: number;
}

export interface SupplierEvaluationCriteriaInput {
  financialWeight: number;
  qualityWeight: number;
  deliveryWeight: number;
  communicationWeight: number;
  autoApproveThreshold?: number;
}

// Типы для настроек уведомлений отдела
export interface DepartmentNotificationsInput {
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
}

export interface DepartmentNotificationsResult {
  success: boolean;
  message: string;
  affectedUsers: number;
}

// Типы для аналитики
export interface AnalyticsSummary {
  totalSuppliers: number;
  pendingSuppliers: number;
  approvedSuppliers: number;
  rejectedSuppliers: number;
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  totalPaymentsAmount: number;
  pendingPaymentsAmount: number;
}

export interface SuppliersByCountry {
  country: string;
  count: number;
}

export interface SuppliersByCategory {
  category: string;
  count: number;
}

export interface ContractsByStatus {
  status: ContractStatus;
  count: number;
  value: number;
}

export interface PaymentsByMonth {
  month: string;
  amount: number;
}

// Типы для системной статистики
export interface SystemStatistics {
  users: UserStatistics;
  auditLogs: AuditLogStatistics;
  permissions: PermissionStatistics;
  settings: SettingStatistics;
  timestamp: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  managers: number;
  specialists: number;
}

export interface AuditLogStatistics {
  totalLogs: number;
  lastDay: number;
  lastWeek: number;
  lastMonth: number;
}

export interface PermissionStatistics {
  totalPerms: number;
  granted: number;
  denied: number;
}

export interface SettingStatistics {
  totalSettings: number;
  publicSettings: number;
}

export interface DatabaseStatistics {
  tableName: string;
  rowCount: number;
  totalSizeBytes: number;
  totalSize: string;
}

// Типы для пагинации
export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Типы для фильтров
export interface SupplierFilterInput {
  search?: string;
  status?: SupplierStatus;
  categoryIds?: string[];
  country?: string;
}

export interface ContractFilterInput {
  search?: string;
  status?: ContractStatus;
  supplierId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  minValue?: number;
  maxValue?: number;
}

export interface PaymentFilterInput {
  search?: string;
  status?: PaymentStatus;
  supplierId?: string;
  contractId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}
