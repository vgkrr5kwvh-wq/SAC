-- CreateTable
CREATE TABLE `Enquiry` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `interest` VARCHAR(200) NULL,
    `message` TEXT NOT NULL,
    `clientHash` CHAR(64) NOT NULL,
    `notificationStatus` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `notificationFailedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Enquiry_clientHash_createdAt_idx`(`clientHash`, `createdAt`),
    INDEX `Enquiry_email_createdAt_idx`(`email`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
