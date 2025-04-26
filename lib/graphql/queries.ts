import { gql } from 'graphql-request';

// Запросы для пользователей
export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    currentUser {
      id
      email
      firstName
      lastName
      role
      department
      isActive
      lastLogin
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      firstName
      lastName
      role
      department
      isActive
      lastLogin
      createdAt
      updatedAt
    }
  }
`;

export const GET_USERS_QUERY = gql`
  query GetUsers($pagination: PaginationInput, $search: String) {
    users(pagination: $pagination, search: $search) {
      items {
        id
        email
        firstName
        lastName
        role
        department
        isActive
        lastLogin
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Запросы для категорий поставщиков
export const GET_SUPPLIER_CATEGORY_QUERY = gql`
  query GetSupplierCategory($id: ID!) {
    supplierCategory(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      createdBy {
        id
        firstName
        lastName
      }
    }
  }
`;

export const GET_SUPPLIER_CATEGORIES_QUERY = gql`
  query GetSupplierCategories($pagination: PaginationInput, $search: String) {
    supplierCategories(pagination: $pagination, search: $search) {
      items {
        id
        name
        description
        createdAt
        updatedAt
        createdBy {
          id
          firstName
          lastName
        }
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Запросы для поставщиков
export const GET_SUPPLIER_QUERY = gql`
  query GetSupplier($id: ID!) {
    supplier(id: $id) {
      id
      name
      legalName
      taxId
      registrationNumber
      address
      city
      state
      country
      postalCode
      phoneNumber
      email
      website
      status
      notes
      financialStability
      qualityRating
      deliveryRating
      communicationRating
      overallRating
      bankAccountInfo
      contactPersonName
      contactPersonEmail
      contactPersonPhone
      categories {
        id
        name
      }
      createdBy {
        id
        firstName
        lastName
      }
      updatedBy {
        id
        firstName
        lastName
      }
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_SUPPLIERS_QUERY = gql`
  query GetSuppliers($pagination: PaginationInput, $filter: SupplierFilterInput) {
    suppliers(pagination: $pagination, filter: $filter) {
      items {
        id
        name
        legalName
        taxId
        email
        phoneNumber
        country
        city
        status
        overallRating
        categories {
          id
          name
        }
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Запросы для контрактов
export const GET_CONTRACT_QUERY = gql`
  query GetContract($id: ID!) {
    contract(id: $id) {
      id
      title
      supplier {
        id
        name
      }
      contractNumber
      description
      startDate
      endDate
      value
      currency
      status
      terms
      paymentTerms
      deliveryTerms
      createdBy {
        id
        firstName
        lastName
      }
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      createdAt
      updatedAt
      documents {
        id
        name
        fileName
      }
      daysRemaining
    }
  }
`;

export const GET_CONTRACTS_QUERY = gql`
  query GetContracts($pagination: PaginationInput, $filter: ContractFilterInput) {
    contracts(pagination: $pagination, filter: $filter) {
      items {
        id
        title
        supplier {
          id
          name
        }
        contractNumber
        startDate
        endDate
        value
        currency
        status
        createdAt
        updatedAt
        daysRemaining
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_EXPIRING_CONTRACTS_QUERY = gql`
  query GetExpiringContracts($daysThreshold: Int, $pagination: PaginationInput) {
    expiringContracts(daysThreshold: $daysThreshold, pagination: $pagination) {
      items {
        id
        title
        supplier {
          id
          name
        }
        contractNumber
        startDate
        endDate
        value
        currency
        status
        daysRemaining
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_CONTRACT_EXPIRATION_SUMMARY = gql`
  query GetContractExpirationSummary {
    contractExpirationSummary {
      expiringSoon
      expiringLater
      expired
      highValueContract {
        id
        title
        value
        currency
        endDate
        supplier {
          id
          name
        }
      }
    }
  }
`;

// Запросы для платежей
export const GET_PAYMENT_QUERY = gql`
  query GetPayment($id: ID!) {
    payment(id: $id) {
      id
      supplier {
        id
        name
      }
      contract {
        id
        title
        contractNumber
      }
      amount
      currency
      description
      invoiceNumber
      invoiceDate
      dueDate
      paymentDate
      status
      notes
      requestedBy {
        id
        firstName
        lastName
      }
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      createdAt
      updatedAt
      documents {
        id
        name
        fileName
      }
    }
  }
`;

export const GET_PAYMENTS_QUERY = gql`
  query GetPayments($pagination: PaginationInput, $filter: PaymentFilterInput) {
    payments(pagination: $pagination, filter: $filter) {
      items {
        id
        supplier {
          id
          name
        }
        contract {
          id
          title
          contractNumber
        }
        amount
        currency
        invoiceNumber
        dueDate
        paymentDate
        status
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Запросы для документов
export const GET_DOCUMENT_QUERY = gql`
  query GetDocument($id: ID!) {
    document(id: $id) {
      id
      name
      fileName
      fileType
      fileSize
      filePath
      description
      supplier {
        id
        name
      }
      contract {
        id
        title
      }
      payment {
        id
        invoiceNumber
      }
      uploadedBy {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_DOCUMENTS_QUERY = gql`
  query GetDocuments($pagination: PaginationInput, $supplierId: ID, $contractId: ID, $paymentId: ID) {
    documents(
      pagination: $pagination, 
      supplierId: $supplierId, 
      contractId: $contractId, 
      paymentId: $paymentId
    ) {
      items {
        id
        name
        fileName
        fileType
        fileSize
        filePath
        description
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Запросы для уведомлений
export const GET_NOTIFICATIONS_QUERY = gql`
  query GetNotifications($pagination: PaginationInput, $isRead: Boolean) {
    notifications(pagination: $pagination, isRead: $isRead) {
      items {
        id
        type
        title
        message
        isRead
        entityType
        entityId
        createdAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_NOTIFICATION_SETTINGS_QUERY = gql`
  query GetNotificationSettings {
    notificationSettings {
      id
      supplierCreated
      supplierApproved
      supplierRejected
      contractCreated
      contractApproved
      contractRejected
      paymentRequested
      paymentApproved
      paymentRejected
      documentUploaded
      contractExpiring
      emailNotifications
      inAppNotifications
      createdAt
      updatedAt
    }
  }
`;

// Запросы для аналитики
export const GET_ANALYTICS_SUMMARY_QUERY = gql`
  query GetAnalyticsSummary {
    analyticsSummary {
      totalSuppliers
      pendingSuppliers
      approvedSuppliers
      rejectedSuppliers
      totalContracts
      activeContracts
      expiringContracts
      totalPaymentsAmount
      pendingPaymentsAmount
    }
  }
`;

export const GET_SUPPLIERS_BY_COUNTRY_QUERY = gql`
  query GetSuppliersByCountry {
    suppliersByCountry {
      country
      count
    }
  }
`;

export const GET_SUPPLIERS_BY_CATEGORY_QUERY = gql`
  query GetSuppliersByCategory {
    suppliersByCategory {
      category
      count
    }
  }
`;

export const GET_CONTRACTS_BY_STATUS_QUERY = gql`
  query GetContractsByStatus {
    contractsByStatus {
      status
      count
      value
    }
  }
`;

export const GET_PAYMENTS_BY_MONTH_QUERY = gql`
  query GetPaymentsByMonth($months: Int!) {
    paymentsByMonth(months: $months) {
      month
      amount
    }
  }
`;

// Запросы для административных функций
export const GET_SYSTEM_STATISTICS_QUERY = gql`
  query GetSystemStatistics {
    systemStatistics {
      users {
        totalUsers
        activeUsers
        admins
        managers
        specialists
      }
      auditLogs {
        totalLogs
        lastDay
        lastWeek
        lastMonth
      }
      permissions {
        totalPerms
        granted
        denied
      }
      settings {
        totalSettings
        publicSettings
      }
      timestamp
    }
  }
`;

export const GET_DATABASE_STATISTICS_QUERY = gql`
  query GetDatabaseStatistics {
    databaseStatistics {
      tableName
      rowCount
      totalSizeBytes
      totalSize
    }
  }
`;

export const GET_SYSTEM_SETTINGS_QUERY = gql`
  query GetSystemSettings($pagination: PaginationInput, $search: String, $publicOnly: Boolean) {
    systemSettings(pagination: $pagination, search: $search, publicOnly: $publicOnly) {
      items {
        id
        key
        value
        description
        dataType
        isPublic
        updatedBy {
          id
          firstName
          lastName
        }
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_BACKUP_SETTINGS_QUERY = gql`
  query GetBackupSettings {
    backupSettings {
      backup_enabled
      backup_frequency
      backup_retention_days
      backup_storage_location
      backup_email_notification
      backup_notification_email
    }
  }
`;

// Запросы для разрешений
export const GET_PERMISSIONS_QUERY = gql`
  query GetPermissions($pagination: PaginationInput, $role: UserRole, $resource: String, $action: String) {
    permissions(pagination: $pagination, role: $role, resource: $resource, action: $action) {
      items {
        id
        role
        resource
        action
        description
        isGranted
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_ROLE_PERMISSIONS_MAP_QUERY = gql`
  query GetRolePermissionsMap($role: UserRole!) {
    rolePermissionsMap(role: $role)
  }
`;

// Запросы для менеджера закупок
export const GET_SUPPLIER_EVALUATION_CRITERIA_QUERY = gql`
  query GetSupplierEvaluationCriteria {
    supplierEvaluationCriteria {
      financialWeight
      qualityWeight
      deliveryWeight
      communicationWeight
      autoApproveThreshold
    }
  }
`;

export const GET_DEPARTMENT_SPECIALISTS_QUERY = gql`
  query GetDepartmentSpecialists($department: String!) {
    departmentSpecialists(department: $department) {
      id
      email
      firstName
      lastName
    }
  }
`;

// Запросы для аудита
export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs($pagination: PaginationInput, $filter: AuditLogFilterInput) {
    auditLogs(pagination: $pagination, filter: $filter) {
      items {
        id
        user {
          id
          firstName
          lastName
          email
        }
        action
        entityType
        entityId
        oldValues
        newValues
        ipAddress
        userAgent
        createdAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;
