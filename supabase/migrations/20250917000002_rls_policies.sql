-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth.uid() = id);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

-- Boards policies
CREATE POLICY "Users can manage own boards" ON boards
  FOR ALL USING (user_id = auth.uid());

-- Check-ins policies
CREATE POLICY "Users can manage own check-ins" ON check_ins
  FOR ALL USING (user_id = auth.uid());