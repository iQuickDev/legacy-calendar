UPDATE "User" SET "isAdmin" = true WHERE id = (SELECT id FROM "User" LIMIT 1);
