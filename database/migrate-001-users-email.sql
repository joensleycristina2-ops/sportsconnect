-- Run once on a database created from an older schema.sql (Users.Email was UNIQUE).
-- A second sign-in provider with the same email made every request from that user fail.
DECLARE @c SYSNAME = (SELECT name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('Users') AND type = 'UQ');
IF @c IS NOT NULL EXEC('ALTER TABLE Users DROP CONSTRAINT ' + @c);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email') CREATE INDEX IX_Users_Email ON Users (Email);
