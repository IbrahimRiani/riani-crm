import { z } from "zod";

export const taskSchema = z.object({
  lead_id: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, {
      message: "Lead no válido",
    }),
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  due_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  completed: z.boolean().optional().default(false),
});

export type TaskFormValues = z.input<typeof taskSchema>;
