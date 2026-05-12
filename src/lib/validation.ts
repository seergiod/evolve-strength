import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const emailSchema = z.string().email("Email inválido");

export const usernameSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo");

export type PasswordCheck = {
  length: boolean;
  upper: boolean;
  digit: boolean;
  valid: boolean;
};

export function checkPassword(pw: string): PasswordCheck {
  const length = pw.length >= 8;
  const upper = /[A-Z]/.test(pw);
  const digit = /[0-9]/.test(pw);
  return { length, upper, digit, valid: length && upper && digit };
}
