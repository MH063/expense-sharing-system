\set ON_ERROR_STOP on
-- Initialize test database
\connect expense_test
\i 'Server-side/db/init_postgres_v18.sql'
