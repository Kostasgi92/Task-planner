CREATE ROLE tasknest_owner LOGIN CREATEROLE PASSWORD 'tasknest';
CREATE DATABASE tasknest OWNER tasknest_owner;
CREATE DATABASE tasknest_test OWNER tasknest_owner;
\c tasknest
ALTER SCHEMA public OWNER TO tasknest_owner;
\c tasknest_test
ALTER SCHEMA public OWNER TO tasknest_owner;
