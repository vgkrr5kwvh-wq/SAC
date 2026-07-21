-- Existing administrators retain full access after this additive migration.
ALTER TABLE `AdminUser`
    ADD COLUMN `name` VARCHAR(120) NULL,
    ADD COLUMN `role` ENUM('SUPER_ADMIN', 'EDITOR', 'STAFF') NOT NULL DEFAULT 'SUPER_ADMIN',
    ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;

-- Ownership is nullable so existing blog posts remain valid and unchanged.
ALTER TABLE `BlogPost`
    ADD COLUMN `createdById` VARCHAR(30) NULL,
    ADD COLUMN `updatedById` VARCHAR(30) NULL;

CREATE INDEX `BlogPost_createdById_idx` ON `BlogPost`(`createdById`);
CREATE INDEX `BlogPost_updatedById_idx` ON `BlogPost`(`updatedById`);

ALTER TABLE `BlogPost`
    ADD CONSTRAINT `BlogPost_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `BlogPost_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
