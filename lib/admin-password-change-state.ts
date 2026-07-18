export type PasswordChangeState = {
  status: "idle" | "success" | "error";
  message: string;
  submission: number;
};

export const initialPasswordChangeState: PasswordChangeState = {
  status: "idle",
  message: "",
  submission: 0,
};
