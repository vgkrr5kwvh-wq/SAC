"use server";

import { compare, hash } from "bcryptjs";
import { auth } from "@/auth";
import { parsePasswordChange } from "@/lib/admin-password-change";
import type { PasswordChangeState } from "@/lib/admin-password-change-state";
import { prisma } from "@/lib/prisma";

const bcryptWorkFactor = 12;
const genericFailureMessage = "Unable to update password.";

export async function changePasswordAction(
  previousState: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const failureState: PasswordChangeState = {
    status: "error",
    message: genericFailureMessage,
    submission: previousState.submission + 1,
  };

  try {
    const session = await auth();
    const passwordChange = parsePasswordChange({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!session?.user.id) return failureState;

    const administrator = await prisma.adminUser.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        isActive: true,
      },
    });

    if (!administrator?.isActive) return failureState;

    const currentPasswordMatches = await compare(
      passwordChange?.currentPassword ?? "",
      administrator.passwordHash,
    );
    if (!passwordChange || !currentPasswordMatches) return failureState;

    const passwordHash = await hash(
      passwordChange.newPassword,
      bcryptWorkFactor,
    );

    await prisma.adminUser.update({
      where: { id: session.user.id },
      data: { passwordHash },
      select: { id: true },
    });

    return {
      status: "success",
      message: "Password updated successfully.",
      submission: previousState.submission + 1,
    };
  } catch {
    return failureState;
  }
}
