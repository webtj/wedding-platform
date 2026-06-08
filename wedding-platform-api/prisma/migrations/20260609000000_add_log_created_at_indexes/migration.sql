-- Add single-column createdAt indexes for log stats queries.
CREATE INDEX IF NOT EXISTS "log_requests_createdAt_idx" ON "log_requests"("createdAt");
CREATE INDEX IF NOT EXISTS "log_errors_createdAt_idx" ON "log_errors"("createdAt");
CREATE INDEX IF NOT EXISTS "log_audits_createdAt_idx" ON "log_audits"("createdAt");
CREATE INDEX IF NOT EXISTS "log_events_createdAt_idx" ON "log_events"("createdAt");
