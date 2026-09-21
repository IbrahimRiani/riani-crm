import { z } from "zod";

export const activitySchema = z.object({
  lead_id: z.string().uuid("Lead no válido"),
  type: z.enum(["note", "call", "whatsapp", "email", "meeting", "status_change"]),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export type ActivityFormValues = z.input<typeof activitySchema>;
