import type { User } from "@shared/schema";

export interface AuthResponse {
  user: User;
  token?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const AUTH_STORAGE_KEY = "itennis_pickeball_user";

export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to parse stored user data:", error);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeUser(user: User): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to store user data:", error);
  }
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;

  const rolePermissions: Record<string, string[]> = {
    admin: ["manage_users", "manage_courts", "manage_bookings", "view_analytics", "manage_payments"],
    staff: ["manage_courts", "manage_bookings", "view_analytics"],
    coach: ["manage_own_bookings", "view_court_schedule"],
    member: ["make_bookings", "view_own_bookings"],
    guest: ["make_paid_bookings"],
  };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
}

export function canManageCourts(user: User | null): boolean {
  return hasPermission(user, "manage_courts");
}

export function canManageUsers(user: User | null): boolean {
  return hasPermission(user, "manage_users");
}

export function canViewAnalytics(user: User | null): boolean {
  return hasPermission(user, "view_analytics");
}

export function canMakeBookings(user: User | null): boolean {
  return hasPermission(user, "make_bookings") || hasPermission(user, "make_paid_bookings");
}

export function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

export function getUserInitials(user: User): string {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}

export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: "Administrator",
    staff: "Staff Member",
    coach: "Tennis/Pickleball Coach",
    member: "Club Member",
    guest: "Guest User",
  };

  return roleNames[role] || role;
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "Password must contain both uppercase and lowercase letters" };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }

  return { isValid: true };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
}
