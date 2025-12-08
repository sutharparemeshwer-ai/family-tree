-- Users Table Schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    profile_img_url TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Members Table Schema
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    tree_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    nickname VARCHAR(100),
    profile_img_url TEXT,
    description TEXT,
    gender VARCHAR(50),
    father_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    mother_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    spouse_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);