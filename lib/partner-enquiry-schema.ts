import { z } from "zod";

export const partnerEnquirySchema = z.object({
  partnerType: z.enum(["university", "agent"]),

  contactName: z
    .string()
    .trim()
    .min(2, "Please enter the contact name.")
    .max(120),

  workEmail: z
    .string()
    .trim()
    .email("Please enter a valid work email.")
    .max(254),

  organisation: z
    .string()
    .trim()
    .min(2, "Please enter the organisation name.")
    .max(200),

  locations: z
    .string()
    .trim()
    .min(2, "Please enter the relevant locations.")
    .max(255),

  partnershipProposal: z
    .string()
    .trim()
    .min(2, "Please select a partnership proposal.")
    .max(200),

  details: z
    .string()
    .trim()
    .min(10, "Please provide more partnership details.")
    .max(5000),

  additionalDetails: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .default(""),

  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default(""),
});

export type PartnerEnquiryPayload = z.infer<
  typeof partnerEnquirySchema
>;
