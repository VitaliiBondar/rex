/*
  Warnings:

  - You are about to drop the column `responsibleUserId` on the `Candidate` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "position" TEXT,
    "recruitmentType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNIT_SEARCH',
    "note" TEXT NOT NULL DEFAULT '',
    "unitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("age", "channel", "createdAt", "fullName", "gender", "id", "note", "position", "recruitmentType", "status", "unitId", "updatedAt") SELECT "age", "channel", "createdAt", "fullName", "gender", "id", "note", "position", "recruitmentType", "status", "unitId", "updatedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
