-- Test data for development
-- This creates sample users, boards, and check-ins for testing

-- Insert test user
INSERT INTO users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com');

-- Insert API key for test user (hash of 'test-api-key-12345678901234567')
INSERT INTO api_keys (id, user_id, key_hash, label) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Test API Key');

-- Insert test boards
INSERT INTO boards (id, user_id, name, description, color) VALUES
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Morning Exercise', 'Daily workout routine', '#22c55e'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Read Books', '30 minutes of reading', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Meditation', 'Daily mindfulness practice', '#8b5cf6');

-- Insert some test check-ins
INSERT INTO check_ins (board_id, user_id, date, completed, notes) VALUES
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - INTERVAL '2 days', true, '30 minute run'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - INTERVAL '1 day', true, 'Gym workout'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - INTERVAL '1 day', true, 'Read fiction book'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE, false, null);