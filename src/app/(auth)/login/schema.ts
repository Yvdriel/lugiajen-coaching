import { z } from "zod";

// Shared by the client form (RHF resolver) and the server action (convention 8).
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht.")
    .email("Ongeldig e-mailadres."),
  password: z.string().min(1, "Wachtwoord is verplicht."),
});

export type LoginInput = z.infer<typeof loginSchema>;
