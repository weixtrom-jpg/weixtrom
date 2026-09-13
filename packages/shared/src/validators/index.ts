import { AUTH } from '../constants';

export function isValidColombianPlate(plate: string): boolean {
  const patterns = [
    /^[A-Z]{3}\d{3}$/,
    /^[A-Z]{3}\d{2}[A-Z]$/,
    /^[A-Z]{3}\d{2}[A-Z0-9]$/,
  ];
  const normalized = plate.toUpperCase().replace(/[\s-]/g, '');
  return patterns.some((p) => p.test(normalized));
}

export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < AUTH.PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Mínimo ${AUTH.PASSWORD_MIN_LENGTH} caracteres` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Debe contener al menos una mayúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Debe contener al menos una minúscula' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Debe contener al menos un número' };
  }
  return { valid: true };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
