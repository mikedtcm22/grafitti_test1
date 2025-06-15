-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    passcode_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create styles table
CREATE TABLE styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    font_url TEXT NOT NULL,
    svg_url TEXT NOT NULL,
    premium BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profile_styles junction table
CREATE TABLE profile_styles (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
    owned BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (profile_id, style_id)
);

-- Create tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    selector_hash TEXT NOT NULL,
    style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true
);

-- Create connections table
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend', 'group')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group_members junction table
CREATE TABLE group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
    PRIMARY KEY (group_id, profile_id)
);

-- Create licenses table (for Tier 1 auth)
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT UNIQUE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_tags_url ON tags(url);
CREATE INDEX idx_tags_profile_id ON tags(profile_id);
CREATE INDEX idx_connections_profile_id ON connections(profile_id);
CREATE INDEX idx_connections_friend_profile_id ON connections(friend_profile_id);
CREATE INDEX idx_group_members_profile_id ON group_members(profile_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Profiles: Users can only read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Tags: Users can read their own tags and tags from connected profiles
CREATE POLICY "Users can read own and connected tags"
    ON tags FOR SELECT
    USING (
        profile_id = auth.uid() OR
        profile_id IN (
            SELECT friend_profile_id FROM connections 
            WHERE profile_id = auth.uid()
        )
    );

-- Tags: Users can only modify their own tags
CREATE POLICY "Users can modify own tags"
    ON tags FOR ALL
    USING (profile_id = auth.uid());

-- Styles: Everyone can read styles
CREATE POLICY "Anyone can read styles"
    ON styles FOR SELECT
    USING (true);

-- Profile Styles: Users can only read their own style ownership
CREATE POLICY "Users can read own style ownership"
    ON profile_styles FOR SELECT
    USING (profile_id = auth.uid());

-- Connections: Users can only read their own connections
CREATE POLICY "Users can read own connections"
    ON connections FOR SELECT
    USING (profile_id = auth.uid());

-- Groups: Users can read groups they're members of
CREATE POLICY "Users can read groups they're members of"
    ON groups FOR SELECT
    USING (
        id IN (
            SELECT group_id FROM group_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Group Members: Users can read members of groups they're in
CREATE POLICY "Users can read members of their groups"
    ON group_members FOR SELECT
    USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Licenses: Only server-side access
CREATE POLICY "No direct access to licenses"
    ON licenses FOR ALL
    USING (false); 