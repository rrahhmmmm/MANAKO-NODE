-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'inspector', 'viewer', 'vendor_contact');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('inisiasi', 'running', 'completed', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('new', 'renewal');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('rutin', 'non_rutin');

-- CreateEnum
CREATE TYPE "TerminType" AS ENUM ('monthly', 'quarterly', 'percentage', 'oneoff');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'uploaded', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "DocTypeStage" AS ENUM ('inisiasi', 'pelaksanaan');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'whatsapp', 'inapp');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed');

-- CreateEnum
CREATE TYPE "RequirementScope" AS ENUM ('init', 'termin');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "password_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(150),
    "contact_phone" VARCHAR(30),
    "contact_email" VARCHAR(150),
    "npwp" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "vendor_id" INTEGER,
    "pic_ikt_id" INTEGER,
    "pic_vendor_id" INTEGER,
    "value" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "contract_file" VARCHAR(255),
    "status" "ProjectStatus" NOT NULL DEFAULT 'inisiasi',
    "contract_type" "ContractType" NOT NULL DEFAULT 'new',
    "parent_project_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "classification" "Classification" DEFAULT 'rutin',
    "no_kontrak" VARCHAR(255),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termins" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" VARCHAR(100),
    "type" "TerminType" NOT NULL DEFAULT 'oneoff',
    "period_start" DATE,
    "period_end" DATE,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(20,2),
    "due_date" DATE,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_types" (
    "id" SERIAL NOT NULL,
    "keyname" VARCHAR(100),
    "label" VARCHAR(200),
    "stage" "DocTypeStage" NOT NULL DEFAULT 'pelaksanaan',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "termin_id" INTEGER,
    "doc_type_id" INTEGER NOT NULL,
    "file_path" VARCHAR(500),
    "file_name" VARCHAR(255),
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMPTZ(6),
    "verified_by" INTEGER,
    "verified_at" TIMESTAMPTZ(6),
    "status" "DocumentStatus" DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termin_documents" (
    "id" SERIAL NOT NULL,
    "termin_id" INTEGER NOT NULL,
    "doc_type" VARCHAR(64) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custom_label" VARCHAR(200),
    "code_project" VARCHAR(50) NOT NULL,

    CONSTRAINT "termin_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiation_documents" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "doc_type" VARCHAR(64) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "no_document" VARCHAR(255),
    "doc_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initiation_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" SERIAL NOT NULL,
    "scope" "RequirementScope" NOT NULL,
    "project_id" INTEGER NOT NULL,
    "termin_id" INTEGER,
    "doc_type" VARCHAR(64) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "label" VARCHAR(200),
    "bypass_check" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_po_termin_coverage" (
    "id" SERIAL NOT NULL,
    "init_doc_id" INTEGER NOT NULL,
    "termin_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_po_termin_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER,
    "termin_id" INTEGER,
    "doc_type_id" INTEGER,
    "sent_to" INTEGER,
    "channel" "NotificationChannel",
    "message" TEXT,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationStatus" DEFAULT 'sent',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(200),
    "meta" JSONB,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_vendor_id_idx" ON "projects"("vendor_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_classification_idx" ON "projects"("classification");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "termins_project_id_idx" ON "termins"("project_id");

-- CreateIndex
CREATE INDEX "termins_due_date_idx" ON "termins"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "doc_types_keyname_key" ON "doc_types"("keyname");

-- CreateIndex
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "documents_termin_id_idx" ON "documents"("termin_id");

-- CreateIndex
CREATE INDEX "documents_doc_type_id_idx" ON "documents"("doc_type_id");

-- CreateIndex
CREATE INDEX "termin_documents_code_project_idx" ON "termin_documents"("code_project");

-- CreateIndex
CREATE UNIQUE INDEX "termin_documents_termin_id_doc_type_key" ON "termin_documents"("termin_id", "doc_type");

-- CreateIndex
CREATE INDEX "initiation_documents_project_id_doc_type_idx" ON "initiation_documents"("project_id", "doc_type");

-- CreateIndex
CREATE INDEX "document_requirements_project_id_idx" ON "document_requirements"("project_id");

-- CreateIndex
CREATE INDEX "document_requirements_termin_id_idx" ON "document_requirements"("termin_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_scope_project_id_termin_id_doc_type_key" ON "document_requirements"("scope", "project_id", "termin_id", "doc_type");

-- CreateIndex
CREATE INDEX "pr_po_termin_coverage_termin_id_idx" ON "pr_po_termin_coverage"("termin_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_po_termin_coverage_init_doc_id_termin_id_key" ON "pr_po_termin_coverage"("init_doc_id", "termin_id");

-- CreateIndex
CREATE INDEX "notifications_sent_to_idx" ON "notifications"("sent_to");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_pic_ikt_id_fkey" FOREIGN KEY ("pic_ikt_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_pic_vendor_id_fkey" FOREIGN KEY ("pic_vendor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_project_id_fkey" FOREIGN KEY ("parent_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termins" ADD CONSTRAINT "termins_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "termins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "doc_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termin_documents" ADD CONSTRAINT "termin_documents_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "termins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiation_documents" ADD CONSTRAINT "initiation_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_po_termin_coverage" ADD CONSTRAINT "pr_po_termin_coverage_init_doc_id_fkey" FOREIGN KEY ("init_doc_id") REFERENCES "initiation_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_po_termin_coverage" ADD CONSTRAINT "pr_po_termin_coverage_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "termins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "termins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "doc_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sent_to_fkey" FOREIGN KEY ("sent_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
