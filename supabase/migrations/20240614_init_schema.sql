-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name text NOT NULL,
    passcode_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create styles table
CREATE TABLE IF NOT EXISTS styles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    font_url text NOT NULL,
    svg_url text NOT NULL,
    premium boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    url text NOT NULL,
    selector_hash text NOT NULL,
    style_id uuid REFERENCES styles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    active boolean NOT NULL DEFAULT true
);

-- Enable RLS and add permissive policy for anon on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON profiles FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON styles FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON tags FOR ALL TO anon USING (true); 