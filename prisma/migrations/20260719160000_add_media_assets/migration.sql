-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(30) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `secureUrl` VARCHAR(2048) NULL,
    `publicId` VARCHAR(255) NULL,
    `provider` VARCHAR(50) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `altText` VARCHAR(300) NULL,
    `caption` VARCHAR(1000) NULL,
    `folder` VARCHAR(255) NULL,
    `uploadedById` VARCHAR(30) NULL,
    `checksum` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaAsset_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `MediaAsset_checksum_key`(`checksum`),
    INDEX `MediaAsset_provider_idx`(`provider`),
    INDEX `MediaAsset_folder_idx`(`folder`),
    INDEX `MediaAsset_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
