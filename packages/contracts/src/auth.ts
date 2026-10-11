import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  /** Validade do token em segundos. */
  expiresIn: z.number().int().positive(),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
