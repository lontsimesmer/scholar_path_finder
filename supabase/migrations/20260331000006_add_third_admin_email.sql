-- Add admin@powerprestation.com to admins table
INSERT INTO admins (email) VALUES ('admin@powerprestation.com') ON CONFLICT DO NOTHING;
