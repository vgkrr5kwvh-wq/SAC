-- Additive Phase 1 university intelligence tables. Existing tables and data are unchanged.

CREATE TABLE `University` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `country` VARCHAR(120) NULL,
  `state` VARCHAR(120) NULL,
  `city` VARCHAR(120) NULL,
  `address` VARCHAR(500) NULL,
  `institutionType` VARCHAR(120) NULL,
  `foundedYear` INTEGER NULL,
  `description` LONGTEXT NULL,
  `officialWebsiteUrl` VARCHAR(2048) NULL,
  `logoUrl` VARCHAR(2048) NULL,
  `bannerImageUrl` VARCHAR(2048) NULL,
  `publicationStatus` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `University_slug_key`(`slug`),
  INDEX `University_name_city_state_idx`(`name`, `city`, `state`),
  INDEX `University_country_state_city_idx`(`country`, `state`, `city`),
  INDEX `University_publicationStatus_idx`(`publicationStatus`),
  INDEX `University_officialWebsiteUrl_idx`(`officialWebsiteUrl`(191)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UniversitySource` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUniversityUrl` VARCHAR(2048) NOT NULL,
  `sourceExternalId` VARCHAR(255) NULL,
  `lastCheckedAt` DATETIME(3) NULL,
  `lastSuccessfulSyncAt` DATETIME(3) NULL,
  `rawDataHash` CHAR(64) NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UniversitySource_sourceName_sourceUniversityUrl_key`(`sourceName`, `sourceUniversityUrl`(500)),
  INDEX `UniversitySource_universityId_isPrimary_idx`(`universityId`, `isPrimary`),
  INDEX `UniversitySource_sourceName_sourceExternalId_idx`(`sourceName`, `sourceExternalId`),
  INDEX `UniversitySource_rawDataHash_idx`(`rawDataHash`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `degreeLevel` VARCHAR(120) NULL,
  `subjectArea` VARCHAR(160) NULL,
  `durationText` VARCHAR(255) NULL,
  `creditsText` VARCHAR(255) NULL,
  `isStem` BOOLEAN NULL,
  `programUrl` VARCHAR(2048) NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `publicationStatus` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Program_universityId_slug_key`(`universityId`, `slug`),
  INDEX `Program_universityId_degreeLevel_idx`(`universityId`, `degreeLevel`),
  INDEX `Program_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  INDEX `Program_publicationStatus_idx`(`publicationStatus`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdmissionRequirement` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `programId` VARCHAR(30) NULL,
  `studyLevel` VARCHAR(120) NULL,
  `minimumGpa` DECIMAL(5,2) NULL,
  `academicRequirementText` TEXT NULL,
  `ieltsOverall` DECIMAL(5,2) NULL,
  `toeflOverall` DECIMAL(6,2) NULL,
  `pteOverall` DECIMAL(5,2) NULL,
  `duolingoOverall` DECIMAL(6,2) NULL,
  `greRequired` BOOLEAN NULL,
  `gmatRequired` BOOLEAN NULL,
  `satRequired` BOOLEAN NULL,
  `applicationFee` DECIMAL(12,2) NULL,
  `currency` VARCHAR(10) NULL,
  `requirementUrl` VARCHAR(2048) NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AdmissionRequirement_universityId_studyLevel_idx`(`universityId`, `studyLevel`),
  INDEX `AdmissionRequirement_programId_idx`(`programId`),
  INDEX `AdmissionRequirement_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Tuition` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `programId` VARCHAR(30) NULL,
  `studyLevel` VARCHAR(120) NULL,
  `amount` DECIMAL(14,2) NULL,
  `currency` VARCHAR(10) NULL,
  `period` VARCHAR(80) NULL,
  `livingCost` DECIMAL(14,2) NULL,
  `insuranceCost` DECIMAL(14,2) NULL,
  `otherFees` DECIMAL(14,2) NULL,
  `estimatedCoa` DECIMAL(14,2) NULL,
  `tuitionUrl` VARCHAR(2048) NULL,
  `academicYear` VARCHAR(40) NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Tuition_universityId_studyLevel_idx`(`universityId`, `studyLevel`),
  INDEX `Tuition_programId_idx`(`programId`),
  INDEX `Tuition_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Scholarship` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `programId` VARCHAR(30) NULL,
  `name` VARCHAR(255) NULL,
  `scholarshipAvailable` ENUM('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `amountText` VARCHAR(500) NULL,
  `minimumAmount` DECIMAL(14,2) NULL,
  `maximumAmount` DECIMAL(14,2) NULL,
  `currency` VARCHAR(10) NULL,
  `scholarshipType` VARCHAR(120) NULL,
  `eligibilityText` TEXT NULL,
  `minimumGpa` DECIMAL(5,2) NULL,
  `isAutomatic` BOOLEAN NULL,
  `requiresSeparateApplication` BOOLEAN NULL,
  `isRenewable` BOOLEAN NULL,
  `renewalCriteria` TEXT NULL,
  `deadlineText` VARCHAR(255) NULL,
  `scholarshipUrl` VARCHAR(2048) NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `publicationStatus` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Scholarship_universityId_scholarshipAvailable_idx`(`universityId`, `scholarshipAvailable`),
  INDEX `Scholarship_programId_idx`(`programId`),
  INDEX `Scholarship_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  INDEX `Scholarship_publicationStatus_idx`(`publicationStatus`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Intake` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `programId` VARCHAR(30) NULL,
  `term` VARCHAR(120) NOT NULL,
  `month` INTEGER NULL,
  `year` INTEGER NULL,
  `deadline` DATETIME(3) NULL,
  `intakeUrl` VARCHAR(2048) NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Intake_universityId_term_year_idx`(`universityId`, `term`, `year`),
  INDEX `Intake_programId_idx`(`programId`),
  INDEX `Intake_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UniversityLink` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `type` VARCHAR(80) NOT NULL,
  `label` VARCHAR(160) NULL,
  `url` VARCHAR(2048) NOT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UniversityLink_universityId_type_url_key`(`universityId`, `type`, `url`(500)),
  INDEX `UniversityLink_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UniversityAlias` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `normalizedName` VARCHAR(255) NOT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `UniversityAlias_universityId_normalizedName_key`(`universityId`, `normalizedName`),
  INDEX `UniversityAlias_normalizedName_idx`(`normalizedName`),
  INDEX `UniversityAlias_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ImportJob` (
  `id` VARCHAR(30) NOT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `mode` ENUM('PILOT', 'DRY_RUN') NOT NULL DEFAULT 'PILOT',
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `discoveredCount` INTEGER NOT NULL DEFAULT 0,
  `importedCount` INTEGER NOT NULL DEFAULT 0,
  `updatedCount` INTEGER NOT NULL DEFAULT 0,
  `skippedCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `errorSummary` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ImportJob_sourceName_createdAt_idx`(`sourceName`, `createdAt`),
  INDEX `ImportJob_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ImportRecord` (
  `id` VARCHAR(30) NOT NULL,
  `importJobId` VARCHAR(30) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `entityType` VARCHAR(80) NOT NULL,
  `entityName` VARCHAR(255) NULL,
  `status` ENUM('STAGED', 'IMPORTED', 'UPDATED', 'SKIPPED', 'FAILED', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'STAGED',
  `rawPayload` JSON NOT NULL,
  `normalizedPayload` JSON NOT NULL,
  `normalizedDataHash` CHAR(64) NULL,
  `missingFields` JSON NULL,
  `validationErrors` JSON NULL,
  `duplicateWarning` TEXT NULL,
  `duplicateUniversityId` VARCHAR(30) NULL,
  `errorMessage` TEXT NULL,
  `reviewedById` VARCHAR(30) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `reviewNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ImportRecord_importJobId_status_idx`(`importJobId`, `status`),
  INDEX `ImportRecord_sourceUrl_idx`(`sourceUrl`(500)),
  INDEX `ImportRecord_normalizedDataHash_idx`(`normalizedDataHash`),
  INDEX `ImportRecord_duplicateUniversityId_idx`(`duplicateUniversityId`),
  INDEX `ImportRecord_reviewedById_idx`(`reviewedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UniversitySource` ADD CONSTRAINT `UniversitySource_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Program` ADD CONSTRAINT `Program_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdmissionRequirement` ADD CONSTRAINT `AdmissionRequirement_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdmissionRequirement` ADD CONSTRAINT `AdmissionRequirement_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Tuition` ADD CONSTRAINT `Tuition_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Tuition` ADD CONSTRAINT `Tuition_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Scholarship` ADD CONSTRAINT `Scholarship_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Scholarship` ADD CONSTRAINT `Scholarship_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Intake` ADD CONSTRAINT `Intake_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Intake` ADD CONSTRAINT `Intake_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `UniversityLink` ADD CONSTRAINT `UniversityLink_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UniversityAlias` ADD CONSTRAINT `UniversityAlias_universityId_fkey` FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ImportRecord` ADD CONSTRAINT `ImportRecord_importJobId_fkey` FOREIGN KEY (`importJobId`) REFERENCES `ImportJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ImportRecord` ADD CONSTRAINT `ImportRecord_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
