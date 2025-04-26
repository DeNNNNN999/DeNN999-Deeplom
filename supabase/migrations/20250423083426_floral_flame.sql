/*
  # Initial schema for supplier management system

  1. Users and Authentication
    - `users` - User accounts with roles and profile information
    - `permissions` - Role-based access control permissions
  
  2. Supplier Management
    - `supplier_categories` - Categories for organizing suppliers
    - `suppliers` - Main supplier information table
    - `supplier_category_map` - Many-to-many relationship between suppliers and categories
  
  3. Contract Management
    - `contracts` - Contracts with suppliers
  
  4. Payment Management
    - `payments` - Payment records linked to suppliers and contracts
  
  5. Document Management
    - `documents` - Uploaded documents related to suppliers, contracts, or payments
  
  6. System Features
    - `audit_logs` - Track all system actions for accountability
    - `notifications` - System notifications for users
    - `notification_settings` - User preferences for notifications
    - `system_settings` - System-wide configuration settings
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST');
CREATE TYPE supplier_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
CREATE TYPE contract_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE notification_type AS ENUM (
  'SUPPLIER_CREATED', 'SUPPLIER_APPROVED', 'SUPPLIER_REJECTED',
  'CONTRACT_CREATED', 'CONTRACT_APPROVED', 'CONTRACT_REJECTED',
  'PAYMENT_REQUESTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED',
  'DOCUMENT_UPLOADED', 'CONTRACT_EXPIRING'
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'PROCUREMENT_SPECIALIST',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create supplier categories table
CREATE TABLE IF NOT EXISTS supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  registration_number TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  status supplier_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  financial_stability INTEGER,
  quality_rating INTEGER,
  delivery_rating INTEGER,
  communication_rating INTEGER,
  overall_rating INTEGER,
  bank_account_info JSONB,
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create supplier category map table (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_category_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES supplier_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, category_id)
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  value INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status contract_status NOT NULL DEFAULT 'DRAFT',
  terms TEXT,
  payment_terms TEXT,
  delivery_terms TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  invoice_number TEXT,
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  payment_date TIMESTAMPTZ,
  status payment_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_created BOOLEAN NOT NULL DEFAULT TRUE,
  supplier_approved BOOLEAN NOT NULL DEFAULT TRUE,
  supplier_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  contract_created BOOLEAN NOT NULL DEFAULT TRUE,
  contract_approved BOOLEAN NOT NULL DEFAULT TRUE,
  contract_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  payment_requested BOOLEAN NOT NULL DEFAULT TRUE,
  payment_approved BOOLEAN NOT NULL DEFAULT TRUE,
  payment_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  document_uploaded BOOLEAN NOT NULL DEFAULT TRUE,
  contract_expiring BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'string',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  is_granted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_country ON suppliers(country);
CREATE INDEX idx_contracts_supplier_id ON contracts(supplier_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_documents_supplier_id ON documents(supplier_id);
CREATE INDEX idx_documents_contract_id ON documents(contract_id);
CREATE INDEX idx_documents_payment_id ON documents(payment_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_permissions_role ON permissions(role);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Create admin user with password 'admin123'
INSERT INTO users (
  email, 
  password_hash, 
  first_name, 
  last_name, 
  role
) VALUES (
  'admin@example.com',
  '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', -- 'admin123'
  'System',
  'Administrator',
  'ADMIN'
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, data_type, is_public) VALUES
('company_name', 'Supplier Management System', 'Company name displayed in the UI', 'string', TRUE),
('currency_default', 'USD', 'Default currency for financial transactions', 'string', TRUE),
('session_timeout_minutes', '60', 'User session timeout in minutes', 'number', FALSE),
('password_min_length', '8', 'Minimum password length for new users', 'number', FALSE),
('contract_expiry_days', '30', 'Days before contract expiry to send notifications', 'number', FALSE),
('enable_two_factor_auth', 'false', 'Enable two-factor authentication for users', 'boolean', FALSE);

-- Insert initial permission set for ADMIN role
INSERT INTO permissions (role, resource, action, description, is_granted) VALUES
('ADMIN', 'USER', 'CREATE', 'Create user accounts', TRUE),
('ADMIN', 'USER', 'READ', 'View user accounts', TRUE),
('ADMIN', 'USER', 'UPDATE', 'Update user accounts', TRUE),
('ADMIN', 'USER', 'DELETE', 'Delete user accounts', TRUE),
('ADMIN', 'SYSTEM_SETTING', 'READ', 'View system settings', TRUE),
('ADMIN', 'SYSTEM_SETTING', 'UPDATE', 'Update system settings', TRUE),
('ADMIN', 'AUDIT_LOG', 'READ', 'View audit logs', TRUE),
('ADMIN', 'PERMISSION', 'CREATE', 'Create permissions', TRUE),
('ADMIN', 'PERMISSION', 'READ', 'View permissions', TRUE),
('ADMIN', 'PERMISSION', 'UPDATE', 'Update permissions', TRUE);