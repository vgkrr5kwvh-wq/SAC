import { hash } from "bcryptjs";
import { input, password as passwordPrompt } from "@inquirer/prompts";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import {
  normalizeAdminEmail,
  validateAdminPassword,
} from "./admin-credentials";

const bcryptWorkFactor = 12;
const prisma = new PrismaClient();

async function createOrUpdateAdmin(): Promise<void> {
  const emailInput =
    process.env.ADMIN_EMAIL ||
    (await input({ message: "Administrator email:" }));
  const passwordInput = await passwordPrompt({
    message: "Administrator password:",
    mask: "*",
  });

  const email = normalizeAdminEmail(emailInput);
  const password = validateAdminPassword(passwordInput);
  const passwordHash = await hash(password, bcryptWorkFactor);

  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      isActive: true,
    },
    update: {
      passwordHash,
      isActive: true,
    },
  });

  console.log(`Administrator account is ready for ${email}.`);
}

createOrUpdateAdmin()
  .catch((error: unknown) => {
    if (error instanceof ZodError) {
      console.error(
        "Invalid administrator credentials. Check the email format and password policy.",
      );
    } else {
      console.error("Administrator provisioning failed.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
