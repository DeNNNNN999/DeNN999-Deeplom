import { gql } from 'graphql-tag';

// Main schema definition
export const typeDefs = gql`
  # Scalars
  scalar JSON

  # Enums
  enum UserRole {
    ADMIN
    PROCUREMENT_MANAGER
    PROCUREMENT_SPECIALIST
  }

  enum SupplierStatus {
    PENDING
    APPROVED
    REJECTED
    INACTIVE
  }

  enum ContractStatus {
    DRAFT
    PENDING_APPROVAL
    APPROVED
    ACTIVE
    EXPIRED
    TERMINATED
  }

  enum PaymentStatus {
    PENDING
    APPROVED
    PAID
    REJECTED
  }

  enum NotificationType {
    SUPPLIER_CREATED
    SUPPLIER_APPROVED
    SUPPLIER_REJECTED
    CONTRACT_CREATED
    CONTRACT_APPROVED
    CONTRACT_REJECTED
    PAYMENT_REQUESTED
    PAYMENT_APPROVED
    PAYMENT_REJECTED
    DOCUMENT_UPLOADED
    CONTRACT_EXPIRING
    SYSTEM
  }

  enum DataType {
    STRING
    NUMBER
    BOOLEAN
    JSON
  }

  # Input Types
  input UserInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    department: String
  }

  input UserUpdateInput {
    email: String
    firstName: String
    lastName: String
    role: UserRole
    department: String
    isActive: Boolean
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input SupplierCategoryInput {
    name: String!
    description: String
  }

  input SupplierInput {
    name: String!
    legalName: String!
    taxId: String!
    registrationNumber: String!
    address: String!
    city: String!
    state: String
    country: String!
    postalCode: String!
    phoneNumber: String!
    email: String!
    website: String
    notes: String
    contactPersonName: String
    contactPersonEmail: String
    contactPersonPhone: String
    categoryIds: [ID!]
    bankAccountInfo: JSON
  }

  input SupplierRegistrationInput {
    name: String!
    legalName: String!
    taxId: String!
    registrationNumber: String!
    address: String!
    city: String!
    state: String
    country: String!
    postalCode: String!
    phoneNumber: String!
    email: String!
    website: String
    description: String
    contactPersonName: String!
    contactPersonEmail: String!
    contactPersonPhone: String!
    categoryIds: [ID!]!
  }

  input SupplierUpdateInput {
    name: String
    legalName: String
    taxId: String
    registrationNumber: String
    address: String
    city: String
    state: String
    country: String
    postalCode: String
    phoneNumber: String
    email: String
    website: String
    notes: String
    status: SupplierStatus
    contactPersonName: String
    contactPersonEmail: String
    contactPersonPhone: String
    categoryIds: [ID!]
    bankAccountInfo: JSON
  }

  input SupplierRatingInput {
    supplierId: ID!
    financialStability: Int
    qualityRating: Int
    deliveryRating: Int
    communicationRating: Int
    overallRating: Int
  }

  input ContractInput {
    title: String!
    supplierId: ID!
    contractNumber: String!
    description: String
    startDate: String!
    endDate: String!
    value: Int!
    currency: String!
    terms: String
    paymentTerms: String
    deliveryTerms: String
  }

  input ContractUpdateInput {
    title: String
    contractNumber: String
    description: String
    startDate: String
    endDate: String
    value: Int
    currency: String
    status: ContractStatus
    terms: String
    paymentTerms: String
    deliveryTerms: String
  }

  input PaymentInput {
    supplierId: ID!
    contractId: ID
    amount: Int!
    currency: String!
    description: String
    invoiceNumber: String
    invoiceDate: String
    dueDate: String
  }

  input PaymentUpdateInput {
    amount: Int
    currency: String
    description: String
    invoiceNumber: String
    invoiceDate: String
    dueDate: String
    paymentDate: String
    status: PaymentStatus
    notes: String
  }

  input DocumentInput {
    name: String!
    fileName: String!
    fileType: String!
    fileSize: Int!
    filePath: String!
    description: String
    supplierId: ID
    contractId: ID
    paymentId: ID
  }

  input NotificationSettingsInput {
    supplierCreated: Boolean
    supplierApproved: Boolean
    supplierRejected: Boolean
    contractCreated: Boolean
    contractApproved: Boolean
    contractRejected: Boolean
    paymentRequested: Boolean
    paymentApproved: Boolean
    paymentRejected: Boolean
    documentUploaded: Boolean
    contractExpiring: Boolean
    emailNotifications: Boolean
    inAppNotifications: Boolean
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 10
  }

  input SupplierFilterInput {
    search: String
    status: SupplierStatus
    categoryIds: [ID!]
    country: String
  }

  input ContractFilterInput {
    search: String
    status: ContractStatus
    supplierId: ID
    startDateFrom: String
    startDateTo: String
    endDateFrom: String
    endDateTo: String
    minValue: Int
    maxValue: Int
  }

  input PaymentFilterInput {
    search: String
    status: PaymentStatus
    supplierId: ID
    contractId: ID
    dateFrom: String
    dateTo: String
    minAmount: Int
    maxAmount: Int
  }

  input SystemSettingInput {
    key: String!
    value: String!
    description: String
    dataType: String = "string"
    isPublic: Boolean = false
  }

  input SystemSettingUpdateInput {
    value: String!
    description: String
    dataType: String
    isPublic: Boolean
  }

  input PermissionInput {
    role: UserRole!
    resource: String!
    action: String!
    description: String
    isGranted: Boolean!
  }

  input PermissionUpdateInput {
    isGranted: Boolean!
    description: String
  }

  input AuditLogFilterInput {
    userId: ID
    entityType: String
    entityId: String
    action: String
    dateFrom: String
    dateTo: String
  }

  input BackupSettingsInput {
    enabled: Boolean
    frequency: String
    retentionDays: Int
    storageLocation: String
    emailNotification: Boolean
    notificationEmail: String
  }

  input SupplierEvaluationCriteriaInput {
    financialWeight: Int!
    qualityWeight: Int!
    deliveryWeight: Int!
    communicationWeight: Int!
    autoApproveThreshold: Int
  }

  input DepartmentNotificationsInput {
    supplierCreated: Boolean
    supplierApproved: Boolean
    supplierRejected: Boolean
    contractCreated: Boolean
    contractApproved: Boolean
    contractRejected: Boolean
    paymentRequested: Boolean
    paymentApproved: Boolean
    paymentRejected: Boolean
    documentUploaded: Boolean
    contractExpiring: Boolean
    emailNotifications: Boolean
  }

  # Object Types
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    department: String
    isActive: Boolean!
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SupplierCategory {
    id: ID!
    name: String!
    description: String
    createdAt: String!
    updatedAt: String!
    createdBy: User
  }

  type Supplier {
    id: ID!
    name: String!
    legalName: String!
    taxId: String!
    registrationNumber: String!
    address: String!
    city: String!
    state: String
    country: String!
    postalCode: String!
    phoneNumber: String!
    email: String!
    website: String
    status: SupplierStatus!
    notes: String
    financialStability: Int
    qualityRating: Int
    deliveryRating: Int
    communicationRating: Int
    overallRating: Int
    bankAccountInfo: JSON
    contactPersonName: String
    contactPersonEmail: String
    contactPersonPhone: String
    categories: [SupplierCategory!]
    createdBy: User
    updatedBy: User
    approvedBy: User
    approvedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type SupplierRegistrationResult {
    success: Boolean!
    message: String!
    supplier: Supplier
  }

  type Contract {
    id: ID!
    title: String!
    supplier: Supplier!
    contractNumber: String!
    description: String
    startDate: String!
    endDate: String!
    value: Int!
    currency: String!
    status: ContractStatus!
    terms: String
    paymentTerms: String
    deliveryTerms: String
    createdBy: User
    approvedBy: User
    approvedAt: String
    createdAt: String!
    updatedAt: String!
    documents: [Document!]
    daysRemaining: Int
  }

  type Payment {
    id: ID!
    supplier: Supplier!
    contract: Contract
    amount: Int!
    currency: String!
    description: String
    invoiceNumber: String
    invoiceDate: String
    dueDate: String
    paymentDate: String
    status: PaymentStatus!
    notes: String
    requestedBy: User
    approvedBy: User
    approvedAt: String
    createdAt: String!
    updatedAt: String!
    documents: [Document!]
  }

  type Document {
    id: ID!
    name: String!
    fileName: String!
    fileType: String!
    fileSize: Int!
    filePath: String!
    description: String
    supplier: Supplier
    contract: Contract
    payment: Payment
    uploadedBy: User
    createdAt: String!
    updatedAt: String!
  }

  type AuditLog {
    id: ID!
    user: User
    action: String!
    entityType: String!
    entityId: String!
    oldValues: JSON
    newValues: JSON
    ipAddress: String
    userAgent: String
    createdAt: String!
  }

  type Notification {
    id: ID!
    user: User!
    type: NotificationType!
    title: String!
    message: String!
    isRead: Boolean!
    entityType: String
    entityId: String
    createdAt: String!
  }

  type NotificationSettings {
    id: ID!
    user: User!
    supplierCreated: Boolean!
    supplierApproved: Boolean!
    supplierRejected: Boolean!
    contractCreated: Boolean!
    contractApproved: Boolean!
    contractRejected: Boolean!
    paymentRequested: Boolean!
    paymentApproved: Boolean!
    paymentRejected: Boolean!
    documentUploaded: Boolean!
    contractExpiring: Boolean!
    emailNotifications: Boolean!
    inAppNotifications: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type SystemSetting {
    id: ID!
    key: String!
    value: String!
    description: String
    dataType: String!
    isPublic: Boolean!
    updatedBy: User
    createdAt: String!
    updatedAt: String!
  }

  type Permission {
    id: ID!
    role: UserRole!
    resource: String!
    action: String!
    description: String
    isGranted: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type PaginatedUsers {
    items: [User!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedSupplierCategories {
    items: [SupplierCategory!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedSuppliers {
    items: [Supplier!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedContracts {
    items: [Contract!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedPayments {
    items: [Payment!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedDocuments {
    items: [Document!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedAuditLogs {
    items: [AuditLog!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedNotifications {
    items: [Notification!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedSystemSettings {
    items: [SystemSetting!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedPermissions {
    items: [Permission!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type AnalyticsSummary {
    totalSuppliers: Int!
    pendingSuppliers: Int!
    approvedSuppliers: Int!
    rejectedSuppliers: Int!
    totalContracts: Int!
    activeContracts: Int!
    expiringContracts: Int!
    totalPaymentsAmount: Int!
    pendingPaymentsAmount: Int!
  }

  type SuppliersByCountry {
    country: String!
    count: Int!
  }

  type SuppliersByCategory {
    category: String!
    count: Int!
  }

  type ContractsByStatus {
    status: ContractStatus!
    count: Int!
    value: Int!
  }

  type PaymentsByMonth {
    month: String!
    amount: Int!
  }

  type SystemStatistics {
    users: UserStatistics!
    auditLogs: AuditLogStatistics!
    permissions: PermissionStatistics!
    settings: SettingStatistics!
    timestamp: String!
  }

  type UserStatistics {
    totalUsers: Int!
    activeUsers: Int!
    admins: Int!
    managers: Int!
    specialists: Int!
  }

  type AuditLogStatistics {
    totalLogs: Int!
    lastDay: Int!
    lastWeek: Int!
    lastMonth: Int!
  }

  type PermissionStatistics {
    totalPerms: Int!
    granted: Int!
    denied: Int!
  }

  type SettingStatistics {
    totalSettings: Int!
    publicSettings: Int!
  }

  type DatabaseStatistics {
    tableName: String!
    rowCount: Int!
    totalSizeBytes: Int!
    totalSize: String!
  }

  type BackupSettings {
    backup_enabled: Boolean
    backup_frequency: String
    backup_retention_days: Int
    backup_storage_location: String
    backup_email_notification: Boolean
    backup_notification_email: String
  }

  type AdminActionResult {
    success: Boolean!
    message: String!
  }

  type SupplierEvaluationCriteria {
    financialWeight: Int!
    qualityWeight: Int!
    deliveryWeight: Int!
    communicationWeight: Int!
    autoApproveThreshold: Int
  }

  type DepartmentNotificationsResult {
    success: Boolean!
    message: String!
    affectedUsers: Int!
  }

  type ContractExpirationSummary {
    expiringSoon: Int!
    expiringLater: Int!
    expired: Int!
    highValueContract: Contract
  }

  # Queries
  type Query {
    # User queries
    currentUser: User!
    user(id: ID!): User
    users(pagination: PaginationInput, search: String): PaginatedUsers!

    # Supplier category queries
    supplierCategory(id: ID!): SupplierCategory
    supplierCategories(pagination: PaginationInput, search: String): PaginatedSupplierCategories!

    # Supplier queries
    supplier(id: ID!): Supplier
    suppliers(
      pagination: PaginationInput,
      filter: SupplierFilterInput
    ): PaginatedSuppliers!

    # Contract queries
    contract(id: ID!): Contract
    contracts(
      pagination: PaginationInput,
      filter: ContractFilterInput
    ): PaginatedContracts!

    # Payment queries
    payment(id: ID!): Payment
    payments(
      pagination: PaginationInput,
      filter: PaymentFilterInput
    ): PaginatedPayments!

    # Document queries
    document(id: ID!): Document
    documents(
      pagination: PaginationInput,
      supplierId: ID,
      contractId: ID,
      paymentId: ID
    ): PaginatedDocuments!

    # Audit log queries
    auditLog(id: ID!): AuditLog
    auditLogs(
      pagination: PaginationInput,
      filter: AuditLogFilterInput
    ): PaginatedAuditLogs!

    # Notification queries
    notifications(
      pagination: PaginationInput,
      isRead: Boolean
    ): PaginatedNotifications!

    # Notification settings query
    notificationSettings: NotificationSettings

    # System settings queries
    systemSetting(id: ID!, key: String): SystemSetting
    systemSettings(
      pagination: PaginationInput,
      search: String,
      publicOnly: Boolean
    ): PaginatedSystemSettings!

    # Permission queries
    permission(id: ID!): Permission
    permissions(
      pagination: PaginationInput,
      role: UserRole,
      resource: String,
      action: String
    ): PaginatedPermissions!

    # Role permissions mapped for frontend consumption
    rolePermissionsMap(role: UserRole!): JSON!

    # Analytics queries
    analyticsSummary: AnalyticsSummary!
    suppliersByCountry: [SuppliersByCountry!]!
    suppliersByCategory: [SuppliersByCategory!]!
    contractsByStatus: [ContractsByStatus!]!
    paymentsByMonth(months: Int!): [PaymentsByMonth!]!

    # Admin-specific queries
    systemStatistics: SystemStatistics!
    databaseStatistics: [DatabaseStatistics!]!
    backupSettings: BackupSettings!

    # Procurement manager specific queries
    supplierEvaluationCriteria: SupplierEvaluationCriteria!
    departmentSpecialists(department: String!): [User!]!

    # Procurement specialist specific queries
    expiringContracts(
      daysThreshold: Int = 30,
      pagination: PaginationInput
    ): PaginatedContracts!
    contractExpirationSummary: ContractExpirationSummary!
  }

  # Mutations
  type Mutation {
    # Auth mutations
    register(input: UserInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # User mutations
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserUpdateInput!): User!
    deleteUser(id: ID!): Boolean!

    # Supplier category mutations
    createSupplierCategory(input: SupplierCategoryInput!): SupplierCategory!
    updateSupplierCategory(id: ID!, input: SupplierCategoryInput!): SupplierCategory!
    deleteSupplierCategory(id: ID!): Boolean!

    # Supplier mutations
    createSupplier(input: SupplierInput!): Supplier!
    updateSupplier(id: ID!, input: SupplierUpdateInput!): Supplier!
    deleteSupplier(id: ID!): Boolean!
    approveSupplier(id: ID!): Supplier!
    rejectSupplier(id: ID!, reason: String!): Supplier!
    rateSupplier(input: SupplierRatingInput!): Supplier!

    # Public supplier registration
    registerSupplier(input: SupplierRegistrationInput!): SupplierRegistrationResult!

    # Contract mutations
    createContract(input: ContractInput!): Contract!
    updateContract(id: ID!, input: ContractUpdateInput!): Contract!
    deleteContract(id: ID!): Boolean!
    approveContract(id: ID!): Contract!
    rejectContract(id: ID!, reason: String!): Contract!

    # Payment mutations
    createPayment(input: PaymentInput!): Payment!
    updatePayment(id: ID!, input: PaymentUpdateInput!): Payment!
    deletePayment(id: ID!): Boolean!
    approvePayment(id: ID!): Payment!
    rejectPayment(id: ID!, reason: String!): Payment!

    # Document mutations
    uploadDocument(input: DocumentInput!): Document!
    deleteDocument(id: ID!): Boolean!

    # Notification mutations
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!

    # Notification settings mutations
    updateNotificationSettings(input: NotificationSettingsInput!): NotificationSettings!

    # System settings mutations
    createSystemSetting(input: SystemSettingInput!): SystemSetting!
    updateSystemSetting(id: ID!, input: SystemSettingUpdateInput!): SystemSetting!
    deleteSystemSetting(id: ID!): Boolean!

    # Permission mutations
    createPermission(input: PermissionInput!): Permission!
    updatePermission(id: ID!, input: PermissionUpdateInput!): Permission!
    deletePermission(id: ID!): Boolean!

    # Batch update permissions
    updateRolePermissions(role: UserRole!, permissions: [PermissionInput!]!): Boolean!

    # Initialize system with default settings and permissions
    initializeSystem: Boolean!

    # Admin-specific mutations
    resetUserPassword(userId: ID!, newPassword: String!): AdminActionResult!
    changeUserRole(userId: ID!, newRole: String!): AdminActionResult!
    toggleUserStatus(userId: ID!, isActive: Boolean!): AdminActionResult!
    configureBackupSettings(settings: JSON!): AdminActionResult!

    # Procurement manager specific mutations
    setSupplierEvaluationCriteria(input: SupplierEvaluationCriteriaInput!): AdminActionResult!
    setDepartmentNotifications(department: String!, input: DepartmentNotificationsInput!): DepartmentNotificationsResult!
  }

  # Subscriptions
  type Subscription {
    notificationCreated: Notification!
    supplierStatusUpdated: Supplier!
    contractStatusUpdated: Contract!
    paymentStatusUpdated: Payment!
    systemSettingUpdated: SystemSetting!
  }
`;
