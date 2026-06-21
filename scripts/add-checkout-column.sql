-- Run once to add check_out_time to attendance.records
-- psql -U adtp_user -d adtp_db -f scripts/add-checkout-column.sql

ALTER TABLE attendance.records
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

COMMENT ON COLUMN attendance.records.check_out_time IS
  'Optional clock-out timestamp set when admin marks member as departed';
