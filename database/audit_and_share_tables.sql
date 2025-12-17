-- Table to manage active share links
CREATE TABLE IF NOT EXISTS share_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    label VARCHAR(255), -- e.g. "Uncle Bob"
    permissions VARCHAR(50) DEFAULT 'view', -- 'view' or 'edit'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ
);

-- Table to store the audit trail of changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tree_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Who did it?
    actor_name VARCHAR(255) NOT NULL, -- "Paremeshwer" or "Guest Bob"
    actor_email VARCHAR(255),         -- "parm@test.com" or "bob@gmail.com"
    actor_type VARCHAR(50) NOT NULL,  -- 'owner' or 'guest'
    
    -- Where did they come from? (If guest)
    share_link_id INTEGER REFERENCES share_links(id) ON DELETE SET NULL,
    
    -- What did they do?
    action_type VARCHAR(50) NOT NULL, -- 'ADD_MEMBER', 'EDIT_MEMBER', 'DELETE_MEMBER'
    target_name VARCHAR(255),         -- Name of the member being affected
    details JSONB,                    -- Store specific changes (optional)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
