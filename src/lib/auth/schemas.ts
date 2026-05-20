import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(3, "Name must be at least 3 characters").max(50),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "Password must have 8+ chars, 1 uppercase, 1 number, 1 special char")
      .regex(/[A-Z]/, "Password must have 8+ chars, 1 uppercase, 1 number, 1 special char")
      .regex(/[0-9]/, "Password must have 8+ chars, 1 uppercase, 1 number, 1 special char")
      .regex(/[^A-Za-z0-9]/, "Password must have 8+ chars, 1 uppercase, 1 number, 1 special char"),
    confirmPassword: z.string(),
    termsAgreed: z.boolean(),
  })
  .refine((d) => d.termsAgreed === true, {
    message: "Please agree to the terms",
    path: ["termsAgreed"],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3; label: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const label = ["Weak", "Weak", "Medium", "Strong"][score] ?? "Weak";
  return { score: score as 0 | 1 | 2 | 3, label };
}

