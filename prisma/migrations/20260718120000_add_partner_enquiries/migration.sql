-- CreateTable
CREATE TABLE `PartnerEnquiry` (
    `id` VARCHAR(30) NOT NULL,
    `partnerType` VARCHAR(50) NOT NULL,
    `contactName` VARCHAR(120) NOT NULL,
    `workEmail` VARCHAR(254) NOT NULL,
    `organisation` VARCHAR(200) NOT NULL,
    `locations` VARCHAR(255) NOT NULL,
    `partnershipProposal` VARCHAR(200) NOT NULL,
    `details` TEXT NOT NULL,
    `additionalDetails` TEXT NULL,
    `clientHash` CHAR(64) NOT NULL,
    `notificationStatus` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `notificationFailedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PartnerEnquiry_clientHash_createdAt_idx`(`clientHash`, `createdAt`),
    INDEX `PartnerEnquiry_workEmail_createdAt_idx`(`workEmail`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
