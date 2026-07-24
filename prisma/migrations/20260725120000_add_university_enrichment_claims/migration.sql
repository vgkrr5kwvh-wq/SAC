-- Phase 1.1 is layered on 20260724120000_add_university_intelligence_platform.
-- Preserve alternate source URLs before consolidating duplicate university/source rows.
INSERT IGNORE INTO `UniversityLink` (
  `id`, `universityId`, `type`, `label`, `url`, `sourceName`, `sourceUrl`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('srcdup_', SUBSTRING(MD5(CONCAT(loser.`id`, loser.`sourceUniversityUrl`)), 1, 23)),
  loser.`universityId`,
  'source-profile-alternate',
  CONCAT(loser.`sourceName`, ' alternate source profile'),
  loser.`sourceUniversityUrl`,
  loser.`sourceName`,
  loser.`sourceUniversityUrl`,
  loser.`createdAt`,
  loser.`updatedAt`
FROM `UniversitySource` loser
JOIN `UniversitySource` keeper
  ON keeper.`universityId` = loser.`universityId`
 AND keeper.`sourceName` = loser.`sourceName`
 AND (
      keeper.`isPrimary` > loser.`isPrimary`
   OR (keeper.`isPrimary` = loser.`isPrimary` AND keeper.`updatedAt` > loser.`updatedAt`)
   OR (keeper.`isPrimary` = loser.`isPrimary` AND keeper.`updatedAt` = loser.`updatedAt` AND keeper.`id` > loser.`id`)
 );

DELETE loser
FROM `UniversitySource` loser
JOIN `UniversitySource` keeper
  ON keeper.`universityId` = loser.`universityId`
 AND keeper.`sourceName` = loser.`sourceName`
 AND (
      keeper.`isPrimary` > loser.`isPrimary`
   OR (keeper.`isPrimary` = loser.`isPrimary` AND keeper.`updatedAt` > loser.`updatedAt`)
   OR (keeper.`isPrimary` = loser.`isPrimary` AND keeper.`updatedAt` = loser.`updatedAt` AND keeper.`id` > loser.`id`)
 );

DROP INDEX `UniversitySource_sourceName_sourceUniversityUrl_key` ON `UniversitySource`;
CREATE UNIQUE INDEX `UniversitySource_universityId_sourceName_key` ON `UniversitySource`(`universityId`, `sourceName`);
CREATE INDEX `UniversitySource_sourceName_sourceUniversityUrl_idx` ON `UniversitySource`(`sourceName`, `sourceUniversityUrl`(500));

ALTER TABLE `University`
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `University_verificationStatus_idx` ON `University`(`verificationStatus`);

ALTER TABLE `Program`
  ADD COLUMN `studyLevel` VARCHAR(120) NULL,
  ADD COLUMN `award` VARCHAR(160) NULL,
  ADD COLUMN `programType` VARCHAR(120) NULL,
  ADD COLUMN `department` VARCHAR(255) NULL,
  ADD COLUMN `deliveryMode` VARCHAR(120) NULL,
  ADD COLUMN `campus` VARCHAR(160) NULL,
  ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `lastVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `Program_verificationStatus_idx` ON `Program`(`verificationStatus`);
CREATE INDEX `Program_universityId_studyLevel_programType_idx` ON `Program`(`universityId`, `studyLevel`, `programType`);

ALTER TABLE `AdmissionRequirement`
  ADD COLUMN `entryRoute` VARCHAR(80) NULL,
  ADD COLUMN `ieltsListening` DECIMAL(5,2) NULL,
  ADD COLUMN `ieltsReading` DECIMAL(5,2) NULL,
  ADD COLUMN `ieltsWriting` DECIMAL(5,2) NULL,
  ADD COLUMN `ieltsSpeaking` DECIMAL(5,2) NULL,
  ADD COLUMN `toeflListening` DECIMAL(5,2) NULL,
  ADD COLUMN `toeflReading` DECIMAL(5,2) NULL,
  ADD COLUMN `toeflWriting` DECIMAL(5,2) NULL,
  ADD COLUMN `toeflSpeaking` DECIMAL(5,2) NULL,
  ADD COLUMN `actRequired` BOOLEAN NULL,
  ADD COLUMN `credentialEvaluationRequirement` TEXT NULL,
  ADD COLUMN `requiredDocuments` JSON NULL,
  ADD COLUMN `prerequisiteSubjects` TEXT NULL,
  ADD COLUMN `workExperience` TEXT NULL,
  ADD COLUMN `portfolioRequired` BOOLEAN NULL,
  ADD COLUMN `statementOfPurposeRequired` BOOLEAN NULL,
  ADD COLUMN `recommendationLetters` INTEGER NULL,
  ADD COLUMN `applicationUrl` VARCHAR(2048) NULL,
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `AdmissionRequirement_verificationStatus_idx` ON `AdmissionRequirement`(`verificationStatus`);
CREATE INDEX `AdmissionRequirement_university_program_scope_idx` ON `AdmissionRequirement`(`universityId`, `programId`, `studyLevel`, `entryRoute`);

ALTER TABLE `Tuition`
  ADD COLUMN `housingCost` DECIMAL(14,2) NULL,
  ADD COLUMN `mealCost` DECIMAL(14,2) NULL,
  ADD COLUMN `booksCost` DECIMAL(14,2) NULL,
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `Tuition_verificationStatus_idx` ON `Tuition`(`verificationStatus`);

ALTER TABLE `Scholarship`
  ADD COLUMN `studyLevel` VARCHAR(120) NULL,
  ADD COLUMN `entryRoute` VARCHAR(80) NULL,
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `Scholarship_verificationStatus_idx` ON `Scholarship`(`verificationStatus`);

ALTER TABLE `Intake`
  ADD COLUMN `deadlineType` VARCHAR(120) NULL,
  ADD COLUMN `studyLevel` VARCHAR(120) NULL,
  ADD COLUMN `entryRoute` VARCHAR(80) NULL,
  ADD COLUMN `verificationStatus` ENUM('DISCOVERED','PARTNER_MATCHED','OFFICIAL_VERIFIED','MANUALLY_VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'DISCOVERED';
CREATE INDEX `Intake_verificationStatus_idx` ON `Intake`(`verificationStatus`);

ALTER TABLE `ImportJob`
  MODIFY `mode` ENUM('PILOT','DRY_RUN','ENRICHMENT') NOT NULL DEFAULT 'PILOT';

ALTER TABLE `ImportRecord`
  ADD COLUMN `universityId` VARCHAR(30) NULL,
  ADD COLUMN `enrichmentMetadata` JSON NULL;
CREATE INDEX `ImportRecord_universityId_status_idx` ON `ImportRecord`(`universityId`, `status`);
ALTER TABLE `ImportRecord`
  ADD CONSTRAINT `ImportRecord_universityId_fkey`
  FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `UniversityFieldClaim` (
  `id` VARCHAR(30) NOT NULL,
  `universityId` VARCHAR(30) NOT NULL,
  `importRecordId` VARCHAR(30) NOT NULL,
  `programId` VARCHAR(30) NULL,
  `entityType` VARCHAR(80) NOT NULL,
  `entityId` VARCHAR(30) NULL,
  `fieldName` VARCHAR(160) NOT NULL,
  `valueJson` JSON NOT NULL,
  `normalizedValue` TEXT NULL,
  `sourceName` VARCHAR(80) NOT NULL,
  `sourceUrl` VARCHAR(2048) NOT NULL,
  `authorityLevel` ENUM('MANUAL_VERIFIED','OFFICIAL_UNIVERSITY','UNIVERSITY_STUDY','STUDIES_OVERSEAS','PATHWAY_PROVIDER') NOT NULL,
  `confidence` INTEGER NOT NULL,
  `observedAt` DATETIME(3) NOT NULL,
  `rawEvidenceText` TEXT NULL,
  `isPreferred` BOOLEAN NOT NULL DEFAULT false,
  `conflictStatus` ENUM('NONE','CONFLICT_REVIEW','MANUAL_LOCKED','SCOPE_MISMATCH','ACADEMIC_YEAR_MISMATCH','UNRESOLVED') NOT NULL DEFAULT 'NONE',
  `scopeLabel` VARCHAR(120) NULL,
  `studyLevel` VARCHAR(120) NULL,
  `entryRoute` VARCHAR(80) NULL,
  `academicYear` VARCHAR(40) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `UniversityFieldClaim_university_entity_field_idx`(`universityId`, `entityType`, `fieldName`),
  INDEX `UniversityFieldClaim_programId_fieldName_idx`(`programId`, `fieldName`),
  INDEX `UniversityFieldClaim_importRecordId_idx`(`importRecordId`),
  INDEX `UniversityFieldClaim_sourceName_sourceUrl_idx`(`sourceName`, `sourceUrl`(500)),
  INDEX `UniversityFieldClaim_conflict_preferred_idx`(`conflictStatus`, `isPreferred`),
  INDEX `UniversityFieldClaim_scope_idx`(`universityId`, `studyLevel`, `entryRoute`, `academicYear`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UniversityFieldClaim`
  ADD CONSTRAINT `UniversityFieldClaim_universityId_fkey`
  FOREIGN KEY (`universityId`) REFERENCES `University`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UniversityFieldClaim`
  ADD CONSTRAINT `UniversityFieldClaim_importRecordId_fkey`
  FOREIGN KEY (`importRecordId`) REFERENCES `ImportRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UniversityFieldClaim`
  ADD CONSTRAINT `UniversityFieldClaim_programId_fkey`
  FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
