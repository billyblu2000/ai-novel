-- AI Novel Studio Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ Enums ============

DO $$ BEGIN
    CREATE TYPE node_type AS ENUM ('FOLDER', 'FILE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('CHARACTER', 'LOCATION', 'ITEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============ Tables ============

-- Profiles table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Nodes table (recursive file tree)
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type node_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '' NOT NULL,
    outline TEXT DEFAULT '' NOT NULL,
    summary TEXT DEFAULT '' NOT NULL,
    "order" TEXT NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Entities table (world building)
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type entity_type NOT NULL,
    name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}' NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    attributes JSONB DEFAULT '{}' NOT NULL,
    avatar_url TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Mentions table (entity references in nodes)
CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    frequency INTEGER DEFAULT 0 NOT NULL
);

-- Node versions table (version history)
CREATE TABLE IF NOT EXISTS node_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============ Indexes ============

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_project_id ON entities(project_id);
CREATE INDEX IF NOT EXISTS idx_mentions_node_id ON mentions(node_id);
CREATE INDEX IF NOT EXISTS idx_mentions_entity_id ON mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_node_versions_node_id ON node_versions(node_id);

-- Unique constraint for entity name within project
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_project_name ON entities(project_id, name);

-- ============ Row Level Security ============

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_versions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Nodes policies
CREATE POLICY "Users can view nodes in own projects" ON nodes
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create nodes in own projects" ON nodes
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update nodes in own projects" ON nodes
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete nodes in own projects" ON nodes
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Entities policies
CREATE POLICY "Users can view entities in own projects" ON entities
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create entities in own projects" ON entities
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update entities in own projects" ON entities
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete entities in own projects" ON entities
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Mentions policies
CREATE POLICY "Users can view mentions in own projects" ON mentions
    FOR SELECT USING (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create mentions in own projects" ON mentions
    FOR INSERT WITH CHECK (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update mentions in own projects" ON mentions
    FOR UPDATE USING (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete mentions in own projects" ON mentions
    FOR DELETE USING (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Node versions policies
CREATE POLICY "Users can view versions in own projects" ON node_versions
    FOR SELECT USING (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create versions in own projects" ON node_versions
    FOR INSERT WITH CHECK (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete versions in own projects" ON node_versions
    FOR DELETE USING (
        node_id IN (
            SELECT n.id FROM nodes n
            JOIN projects p ON n.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============ Functions & Triggers ============

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
