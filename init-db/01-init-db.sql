-- PostgreSQL database initialization script
-- This script is automatically run when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The tables will be created by Drizzle ORM when the application starts
-- This file is here to ensure any additional database setup can be added if needed

-- Set timezone to UTC
SET timezone = 'UTC';

-- Grant all privileges to the formbuilder_user
GRANT ALL PRIVILEGES ON DATABASE formbuilder TO formbuilder_user;

-- Show database info
SELECT 'Database initialized successfully' as status;