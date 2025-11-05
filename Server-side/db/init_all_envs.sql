-- PostgreSQL 18 multi-environment initializer
\set ON_ERROR_STOP on

-- Please run this with a superuser or a role that can CREATE DATABASE
-- Example: psql -U postgres -h localhost -f Server-side/db/init_all_envs.sql

DO $$
DECLARE
  dbs TEXT[] := ARRAY['expense_dev','expense_test','expense_prod'];
  db TEXT;
BEGIN
  FOREACH db IN ARRAY dbs LOOP
    PERFORM 1 FROM pg_database WHERE datname = db;
    IF NOT FOUND THEN
      EXECUTE format('CREATE DATABASE %I WITH ENCODING ''UTF8'' LC_COLLATE = ''C'' LC_CTYPE = ''C''', db);
      RAISE NOTICE 'Created database %', db;
    ELSE
      RAISE NOTICE 'Database % already exists, skipping create', db;
    END IF;
  END LOOP;
END$$;

\echo 'Importing schema into expense_dev'
\connect expense_dev
\i 'Server-side/db/init_postgres_v18.sql'

\echo 'Importing schema into expense_test'
\connect postgres
\connect expense_test
\i 'Server-side/db/init_postgres_v18.sql'

\echo 'Importing schema into expense_prod'
\connect postgres
\connect expense_prod
\i 'Server-side/db/init_postgres_v18.sql'
\connect postgres
