\set ON_ERROR_STOP on
-- Initialize production database
\connect expense_prod
\i 'Server-side/db/init_postgres_v18.sql'
