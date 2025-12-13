-- Add date columns to family_members table
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS anniversary_date DATE;

COMMENT ON COLUMN family_members.birth_date IS 'Date of birth of the family member';
COMMENT ON COLUMN family_members.anniversary_date IS 'Wedding anniversary date (optional)';
