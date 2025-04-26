import { gql } from 'graphql-request';

// Подписка на создание новых уведомлений
export const NOTIFICATION_CREATED_SUBSCRIPTION = gql`
  subscription NotificationCreated {
    notificationCreated {
      id
      type
      title
      message
      isRead
      entityType
      entityId
      createdAt
    }
  }
`;

// Подписка на обновления статуса поставщика
export const SUPPLIER_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription SupplierStatusUpdated {
    supplierStatusUpdated {
      id
      name
      status
      updatedAt
    }
  }
`;

// Подписка на обновления статуса контракта
export const CONTRACT_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription ContractStatusUpdated {
    contractStatusUpdated {
      id
      title
      status
      updatedAt
    }
  }
`;

// Подписка на обновления статуса платежа
export const PAYMENT_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription PaymentStatusUpdated {
    paymentStatusUpdated {
      id
      amount
      currency
      status
      updatedAt
    }
  }
`;

// Подписка на обновления системных настроек
export const SYSTEM_SETTING_UPDATED_SUBSCRIPTION = gql`
  subscription SystemSettingUpdated {
    systemSettingUpdated {
      id
      key
      value
      dataType
      isPublic
      updatedAt
    }
  }
`;
