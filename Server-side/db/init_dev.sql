\set ON_ERROR_STOP on
-- Initialize development database
\connect expense_dev
\i 'Server-side/db/init_postgres_v18.sql'
