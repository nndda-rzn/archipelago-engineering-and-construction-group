-- Identity & Access schema (FR-FND-003/004): user lifecycle enums, richer User/Role
-- columns, session/login/reset/invitation/settings/activity tables, access-review items.
--
-- Semua ADITIF: tabel baru + kolom nullable + enum via USING cast, sehingga data
-- lama (User.status, Role.status TEXT) dipertahankan tanpa kehilangan baris.

-- 1) Enum tipe
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED');
CREATE TYPE "RoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "UserSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "LoginEventType" AS ENUM ('SUCCESS', 'FAILED_PASSWORD', 'FAILED_STATUS', 'FAILED_UNKNOWN');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- 2) User.status TEXT -> enum
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus" USING ("status"::text::"UserStatus");
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 3) Role.status TEXT -> enum
ALTER TABLE "Role" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Role" ALTER COLUMN "status" TYPE "RoleStatus" USING ("status"::text::"RoleStatus");
ALTER TABLE "Role" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 4) Kolom baru User (identitas kerja, preferensi, siklus hidup, keamanan)
ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN "department" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
ALTER TABLE "User" ADD COLUMN "locale" TEXT DEFAULT 'id-ID';
ALTER TABLE "User" ADD COLUMN "timezone" TEXT DEFAULT 'Asia/Jakarta';
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "blockedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastFailedLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdById" TEXT;
ALTER TABLE "User" ADD COLUMN "updatedById" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
CREATE INDEX "User_status_idx" ON "User"("status");

-- 5) Kolom baru Role + UserRole
ALTER TABLE "Role" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Role_status_idx" ON "Role"("status");
ALTER TABLE "UserRole" ADD COLUMN "assignedById" TEXT;
ALTER TABLE "UserRole" ADD COLUMN "reason" TEXT;
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- 6) Tabel baru
CREATE TABLE "UserSession" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "tokenId"     TEXT NOT NULL,
  "status"      "UserSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "userAgent"   TEXT,
  "ipAddress"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "revokedAt"   TIMESTAMP(3),
  "revokedById" TEXT,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSession_tokenId_key" ON "UserSession"("tokenId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_status_idx" ON "UserSession"("status");
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LoginEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "email"     TEXT NOT NULL,
  "type"      "LoginEventType" NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "reason"    TEXT,
  "at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginEvent_userId_idx" ON "LoginEvent"("userId");
CREATE INDEX "LoginEvent_email_idx" ON "LoginEvent"("email");
CREATE INDEX "LoginEvent_at_idx" ON "LoginEvent"("at");
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PasswordResetToken" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "tokenHash"     TEXT NOT NULL,
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  "usedAt"        TIMESTAMP(3),
  "requestedById" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserInvitation" (
  "id"            TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "username"      TEXT,
  "status"        "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "tokenHash"     TEXT NOT NULL,
  "roleCodes"     TEXT[] DEFAULT ARRAY[]::TEXT[],
  "invitedById"   TEXT,
  "legalEntityId" TEXT,
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  "acceptedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserInvitation_email_idx" ON "UserInvitation"("email");
CREATE INDEX "UserInvitation_status_idx" ON "UserInvitation"("status");
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserSetting" (
  "userId"             TEXT NOT NULL,
  "theme"              TEXT NOT NULL DEFAULT 'system',
  "density"            TEXT NOT NULL DEFAULT 'comfortable',
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserActivity" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "actorId"  TEXT,
  "action"   TEXT NOT NULL,
  "summary"  TEXT NOT NULL,
  "metadata" JSONB,
  "at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");
CREATE INDEX "UserActivity_at_idx" ON "UserActivity"("at");
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AccessReviewItem" (
  "id"         TEXT NOT NULL,
  "reviewId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "decision"   TEXT NOT NULL DEFAULT 'PENDING',
  "reviewerId" TEXT,
  "notes"      TEXT,
  "decidedAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessReviewItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessReviewItem_reviewId_userId_key" ON "AccessReviewItem"("reviewId", "userId");
CREATE INDEX "AccessReviewItem_userId_idx" ON "AccessReviewItem"("userId");
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AccessReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
