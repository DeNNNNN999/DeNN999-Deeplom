import { gql } from 'graphql-request';

// Мутации для пользователей
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        department
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: UserInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        department
      }
    }
  }
`;

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
      role
      department
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
      role
      department
      isActive
      lastLogin
      updatedAt
    }
  }
`;

export const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export const RESET_USER_PASSWORD_MUTATION = gql`
  mutation ResetUserPassword($userId: ID!, $newPassword: String!) {
    resetUserPassword(userId: $userId, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const CHANGE_USER_ROLE_MUTATION = gql`
  mutation ChangeUserRole($userId: ID!, $newRole: String!) {
    changeUserRole(userId: $userId, newRole: $newRole) {
      success
      message
    }
  }
`;

export const TOGGLE_USER_STATUS_MUTATION = gql`
  mutation ToggleUserStatus($userId: ID!, $isActive: Boolean!) {
    toggleUserStatus(userId: $userId, isActive: $isActive) {
      success
      message
    }
  }
`;

// Мутации для категорий поставщиков
export const CREATE_SUPPLIER_CATEGORY_MUTATION = gql`
  mutation CreateSupplierCategory($input: SupplierCategoryInput!) {
    createSupplierCategory(input: $input) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SUPPLIER_CATEGORY_MUTATION = gql`
  mutation UpdateSupplierCategory($id: ID!, $input: SupplierCategoryInput!) {
    updateSupplierCategory(id: $id, input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

export const DELETE_SUPPLIER_CATEGORY_MUTATION = gql`
  mutation DeleteSupplierCategory($id: ID!) {
    deleteSupplierCategory(id: $id)
  }
`;

// Мутации для поставщиков
export const CREATE_SUPPLIER_MUTATION = gql`
  mutation CreateSupplier($input: SupplierInput!) {
    createSupplier(input: $input) {
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
      contactPersonName
      contactPersonEmail
      contactPersonPhone
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SUPPLIER_MUTATION = gql`
  mutation UpdateSupplier($id: ID!, $input: SupplierUpdateInput!) {
    updateSupplier(id: $id, input: $input) {
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
      contactPersonName
      contactPersonEmail
      contactPersonPhone
      updatedAt
    }
  }
`;

export const DELETE_SUPPLIER_MUTATION = gql`
  mutation DeleteSupplier($id: ID!) {
    deleteSupplier(id: $id)
  }
`;

export const APPROVE_SUPPLIER_MUTATION = gql`
  mutation ApproveSupplier($id: ID!) {
    approveSupplier(id: $id) {
      id
      name
      status
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      updatedAt
    }
  }
`;

export const REJECT_SUPPLIER_MUTATION = gql`
  mutation RejectSupplier($id: ID!, $reason: String!) {
    rejectSupplier(id: $id, reason: $reason) {
      id
      name
      status
      notes
      updatedAt
    }
  }
`;

export const RATE_SUPPLIER_MUTATION = gql`
  mutation RateSupplier($input: SupplierRatingInput!) {
    rateSupplier(input: $input) {
      id
      name
      financialStability
      qualityRating
      deliveryRating
      communicationRating
      overallRating
      updatedAt
    }
  }
`;

export const REGISTER_SUPPLIER_MUTATION = gql`
  mutation RegisterSupplier($input: SupplierRegistrationInput!) {
    registerSupplier(input: $input) {
      success
      message
      supplier {
        id
        name
        email
        status
      }
    }
  }
`;

// Мутации для контрактов
export const CREATE_CONTRACT_MUTATION = gql`
  mutation CreateContract($input: ContractInput!) {
    createContract(input: $input) {
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
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CONTRACT_MUTATION = gql`
  mutation UpdateContract($id: ID!, $input: ContractUpdateInput!) {
    updateContract(id: $id, input: $input) {
      id
      title
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
      updatedAt
    }
  }
`;

export const DELETE_CONTRACT_MUTATION = gql`
  mutation DeleteContract($id: ID!) {
    deleteContract(id: $id)
  }
`;

export const APPROVE_CONTRACT_MUTATION = gql`
  mutation ApproveContract($id: ID!) {
    approveContract(id: $id) {
      id
      title
      status
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      updatedAt
    }
  }
`;

export const REJECT_CONTRACT_MUTATION = gql`
  mutation RejectContract($id: ID!, $reason: String!) {
    rejectContract(id: $id, reason: $reason) {
      id
      title
      status
      updatedAt
    }
  }
`;

// Мутации для платежей
export const CREATE_PAYMENT_MUTATION = gql`
  mutation CreatePayment($input: PaymentInput!) {
    createPayment(input: $input) {
      id
      supplier {
        id
        name
      }
      contract {
        id
        title
      }
      amount
      currency
      description
      invoiceNumber
      invoiceDate
      dueDate
      status
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PAYMENT_MUTATION = gql`
  mutation UpdatePayment($id: ID!, $input: PaymentUpdateInput!) {
    updatePayment(id: $id, input: $input) {
      id
      amount
      currency
      description
      invoiceNumber
      invoiceDate
      dueDate
      paymentDate
      status
      notes
      updatedAt
    }
  }
`;

export const DELETE_PAYMENT_MUTATION = gql`
  mutation DeletePayment($id: ID!) {
    deletePayment(id: $id)
  }
`;

export const APPROVE_PAYMENT_MUTATION = gql`
  mutation ApprovePayment($id: ID!) {
    approvePayment(id: $id) {
      id
      status
      approvedBy {
        id
        firstName
        lastName
      }
      approvedAt
      updatedAt
    }
  }
`;

export const REJECT_PAYMENT_MUTATION = gql`
  mutation RejectPayment($id: ID!, $reason: String!) {
    rejectPayment(id: $id, reason: $reason) {
      id
      status
      notes
      updatedAt
    }
  }
`;

// Мутации для документов
export const UPLOAD_DOCUMENT_MUTATION = gql`
  mutation UploadDocument($input: DocumentInput!) {
    uploadDocument(input: $input) {
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
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_DOCUMENT_MUTATION = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`;

// Мутации для уведомлений
export const MARK_NOTIFICATION_AS_READ_MUTATION = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      isRead
      updatedAt
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ_MUTATION = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

export const UPDATE_NOTIFICATION_SETTINGS_MUTATION = gql`
  mutation UpdateNotificationSettings($input: NotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
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
      updatedAt
    }
  }
`;

// Мутации для системных настроек
export const CREATE_SYSTEM_SETTING_MUTATION = gql`
  mutation CreateSystemSetting($input: SystemSettingInput!) {
    createSystemSetting(input: $input) {
      id
      key
      value
      description
      dataType
      isPublic
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SYSTEM_SETTING_MUTATION = gql`
  mutation UpdateSystemSetting($id: ID!, $input: SystemSettingUpdateInput!) {
    updateSystemSetting(id: $id, input: $input) {
      id
      key
      value
      description
      dataType
      isPublic
      updatedAt
    }
  }
`;

export const DELETE_SYSTEM_SETTING_MUTATION = gql`
  mutation DeleteSystemSetting($id: ID!) {
    deleteSystemSetting(id: $id)
  }
`;

// Мутации для разрешений
export const CREATE_PERMISSION_MUTATION = gql`
  mutation CreatePermission($input: PermissionInput!) {
    createPermission(input: $input) {
      id
      role
      resource
      action
      description
      isGranted
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PERMISSION_MUTATION = gql`
  mutation UpdatePermission($id: ID!, $input: PermissionUpdateInput!) {
    updatePermission(id: $id, input: $input) {
      id
      description
      isGranted
      updatedAt
    }
  }
`;

export const DELETE_PERMISSION_MUTATION = gql`
  mutation DeletePermission($id: ID!) {
    deletePermission(id: $id)
  }
`;

export const UPDATE_ROLE_PERMISSIONS_MUTATION = gql`
  mutation UpdateRolePermissions($role: UserRole!, $permissions: [PermissionInput!]!) {
    updateRolePermissions(role: $role, permissions: $permissions)
  }
`;

// Административные мутации
export const INITIALIZE_SYSTEM_MUTATION = gql`
  mutation InitializeSystem {
    initializeSystem
  }
`;

export const CONFIGURE_BACKUP_SETTINGS_MUTATION = gql`
  mutation ConfigureBackupSettings($settings: JSON!) {
    configureBackupSettings(settings: $settings) {
      success
      message
    }
  }
`;

// Мутации для менеджера закупок
export const SET_SUPPLIER_EVALUATION_CRITERIA_MUTATION = gql`
  mutation SetSupplierEvaluationCriteria($input: SupplierEvaluationCriteriaInput!) {
    setSupplierEvaluationCriteria(input: $input) {
      success
      message
    }
  }
`;

export const SET_DEPARTMENT_NOTIFICATIONS_MUTATION = gql`
  mutation SetDepartmentNotifications($department: String!, $input: DepartmentNotificationsInput!) {
    setDepartmentNotifications(department: $department, input: $input) {
      success
      message
      affectedUsers
    }
  }
`;
