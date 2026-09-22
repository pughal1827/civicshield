-- Add reporter_phone column to reports table to securely store caller's phone number

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS reporter_phone TEXT;

-- Create an index to quickly find reports by phone number if needed for Twilio interactions
CREATE INDEX IF NOT EXISTS idx_reports_reporter_phone ON reports (reporter_phone);
