-- Adds the PERFORMER role for troupe members.
--
-- This is deliberately isolated in its own migration. PostgreSQL permits
-- ALTER TYPE ... ADD VALUE inside a transaction, but the new value cannot be
-- referenced until that transaction commits. The next migration uses
-- 'PERFORMER' as a column default, so it must run in a later transaction.

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PERFORMER';
