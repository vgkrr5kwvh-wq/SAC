import { z } from "zod";

const optionalTrimmedString = (maximum: number) =>
  z.string().trim().max(maximum).optional().transform((value) => value || null);

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(120, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(254, "Email address is too long.").transform((value) => value.toLowerCase()),
  interest: optionalTrimmedString(200),
  message: z.string().trim().min(10, "Please tell us a little more about your study goal.").max(5000, "Message is too long."),
  website: z.string().max(200).optional().default(""),
}).strict();

export type EnquiryPayload = z.infer<typeof enquirySchema>;
