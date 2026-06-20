-- Run this once to add the face_descriptor column to core.members
-- psql -U adtp_user -d adtp_db -f scripts/add-face-descriptor-column.sql

ALTER TABLE core.members
  ADD COLUMN IF NOT EXISTS face_descriptor jsonb;

COMMENT ON COLUMN core.members.face_descriptor IS
  '128-float face embedding from face-api.js for face-scan attendance';
