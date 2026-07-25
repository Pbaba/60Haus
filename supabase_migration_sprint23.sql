-- Sprint 23 Database Migrations: Discovery & Search Intelligence

-- 1. Search History
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_searched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_last_searched ON search_history(last_searched_at DESC);

-- 2. Saved Searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- 3. User Collections
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_collections_user ON collections(user_id);

-- 4. Collection Properties Mapping
CREATE TABLE collection_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, property_id)
);
CREATE INDEX idx_collection_properties_col ON collection_properties(collection_id);

-- 5. User Preferences (For Recommendations)
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    preferred_locations TEXT[],
    preferred_property_type TEXT,
    min_budget NUMERIC,
    max_budget NUMERIC,
    min_bedrooms INT,
    pet_friendly BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
