-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'proposal', 'signed', 'converted', 'lost');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('planner', 'couple');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done', 'closed');

-- CreateEnum
CREATE TYPE "TaskAssigneeType" AS ENUM ('planner', 'couple');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ConfirmationEventType" AS ENUM ('created', 'approved', 'rejected', 'reissued');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('uploading', 'ready', 'archived', 'deleted');

-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('pending', 'replied', 'resolved');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('task', 'confirmation', 'annotation', 'asset', 'ai', 'system');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('queued', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('vows', 'speech', 'social_copy', 'planner_marketing');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "weddingDate" TIMESTAMP(3),
    "budgetCents" INTEGER,
    "note" TEXT,
    "lostReason" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedProjectId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_followups" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "leadId" TEXT,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "guestCount" INTEGER,
    "budgetCents" INTEGER,
    "style" TEXT,
    "specialRequirements" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "role" "ProjectMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedName" TEXT NOT NULL,
    "invitedPhone" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "assigneeType" "TaskAssigneeType" NOT NULL,
    "assignedUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'pending',
    "latestComment" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmation_events" (
    "id" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ConfirmationEventType" NOT NULL,
    "comment" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT,
    "objectKey" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'uploading',
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_versions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_annotations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "x" DECIMAL(5,4) NOT NULL,
    "y" DECIMAL(5,4) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'pending',
    "reply" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_timeline_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_timeline_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AiJobType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'queued',
    "requestedByUserId" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_outputs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_convertedProjectId_key" ON "leads"("convertedProjectId");

-- CreateIndex
CREATE INDEX "leads_tenantId_status_idx" ON "leads"("tenantId", "status");

-- CreateIndex
CREATE INDEX "leads_tenantId_createdAt_idx" ON "leads"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_followups_tenantId_leadId_idx" ON "lead_followups"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "clients_tenantId_name_idx" ON "clients"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_leadId_key" ON "projects"("leadId");

-- CreateIndex
CREATE INDEX "projects_tenantId_status_idx" ON "projects"("tenantId", "status");

-- CreateIndex
CREATE INDEX "projects_tenantId_weddingDate_idx" ON "projects"("tenantId", "weddingDate");

-- CreateIndex
CREATE INDEX "project_members_tenantId_userId_idx" ON "project_members"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_role_key" ON "project_members"("projectId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invitations_token_key" ON "couple_invitations"("token");

-- CreateIndex
CREATE INDEX "couple_invitations_tenantId_projectId_idx" ON "couple_invitations"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "tasks_tenantId_projectId_status_idx" ON "tasks"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "confirmations_tenantId_projectId_status_idx" ON "confirmations"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "confirmation_events_tenantId_confirmationId_idx" ON "confirmation_events"("tenantId", "confirmationId");

-- CreateIndex
CREATE INDEX "assets_tenantId_projectId_status_idx" ON "assets"("tenantId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_versions_assetId_version_key" ON "asset_versions"("assetId", "version");

-- CreateIndex
CREATE INDEX "asset_annotations_tenantId_assetId_status_idx" ON "asset_annotations"("tenantId", "assetId", "status");

-- CreateIndex
CREATE INDEX "wedding_timeline_items_tenantId_projectId_sortOrder_idx" ON "wedding_timeline_items"("tenantId", "projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_readAt_idx" ON "notifications"("tenantId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entity_entityId_idx" ON "audit_logs"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "ai_jobs_tenantId_projectId_status_idx" ON "ai_jobs"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "ai_outputs_tenantId_projectId_idx" ON "ai_outputs"("tenantId", "projectId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedProjectId_fkey" FOREIGN KEY ("convertedProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_followups" ADD CONSTRAINT "lead_followups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_followups" ADD CONSTRAINT "lead_followups_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invitations" ADD CONSTRAINT "couple_invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invitations" ADD CONSTRAINT "couple_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmations" ADD CONSTRAINT "confirmations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmation_events" ADD CONSTRAINT "confirmation_events_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "confirmations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmation_events" ADD CONSTRAINT "confirmation_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_annotations" ADD CONSTRAINT "asset_annotations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_annotations" ADD CONSTRAINT "asset_annotations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_timeline_items" ADD CONSTRAINT "wedding_timeline_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
