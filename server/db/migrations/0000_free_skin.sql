DO $$ BEGIN
 CREATE TYPE "contract_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('SUPPLIER_CREATED', 'SUPPLIER_APPROVED', 'SUPPLIER_REJECTED', 'CONTRACT_CREATED', 'CONTRACT_APPROVED', 'CONTRACT_REJECTED', 'PAYMENT_REQUESTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'DOCUMENT_UPLOADED', 'CONTRACT_EXPIRING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('PENDING', 'APPROVED', 'PAID', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "supplier_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"contract_number" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"value" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"terms" text,
	"payment_terms" text,
	"delivery_terms" text,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"supplier_id" uuid,
	"contract_id" uuid,
	"payment_id" uuid,
	"uploaded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"supplier_created" boolean DEFAULT true NOT NULL,
	"supplier_approved" boolean DEFAULT true NOT NULL,
	"supplier_rejected" boolean DEFAULT true NOT NULL,
	"contract_created" boolean DEFAULT true NOT NULL,
	"contract_approved" boolean DEFAULT true NOT NULL,
	"contract_rejected" boolean DEFAULT true NOT NULL,
	"payment_requested" boolean DEFAULT true NOT NULL,
	"payment_approved" boolean DEFAULT true NOT NULL,
	"payment_rejected" boolean DEFAULT true NOT NULL,
	"document_uploaded" boolean DEFAULT true NOT NULL,
	"contract_expiring" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"in_app_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"contract_id" uuid,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"description" text,
	"invoice_number" text,
	"invoice_date" timestamp,
	"due_date" timestamp,
	"payment_date" timestamp,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"requested_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"is_granted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	CONSTRAINT "supplier_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_category_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"tax_id" text NOT NULL,
	"registration_number" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"country" text NOT NULL,
	"postal_code" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text NOT NULL,
	"website" text,
	"status" "supplier_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"financial_stability" integer,
	"quality_rating" integer,
	"delivery_rating" integer,
	"communication_rating" integer,
	"overall_rating" integer,
	"bank_account_info" jsonb,
	"contact_person_name" text,
	"contact_person_email" text,
	"contact_person_phone" text,
	"created_by_id" uuid,
	"updated_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_tax_id_unique" UNIQUE("tax_id"),
	CONSTRAINT "suppliers_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"data_type" text DEFAULT 'string' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'PROCUREMENT_SPECIALIST' NOT NULL,
	"department" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_category_map" ADD CONSTRAINT "supplier_category_map_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_category_map" ADD CONSTRAINT "supplier_category_map_category_id_supplier_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "supplier_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
