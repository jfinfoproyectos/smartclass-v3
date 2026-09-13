import { authClient } from "@/lib/auth-client";

type Role = "admin" | "teacher" | "student";

export function getRoleFromUser(user: unknown): Role | null {
  const u = user as { role?: string; roles?: string[] } | null | undefined;
  if (!u) return null;
  
  // Check if admin role exists anywhere in roles array or is the role property
  const roles = Array.isArray(u.roles) ? u.roles : [];
  if (u.role === "admin" || roles.includes("admin")) return "admin";
  if (u.role === "teacher" || roles.includes("teacher")) return "teacher";
  if (u.role === "student" || roles.includes("student")) return "student";
  
  return "student";
}

export function getRedirectForSession(session: unknown): string | null {
  const s = session as { user?: unknown } | null | undefined;
  if (!s?.user) return null;
  const role = getRoleFromUser(s.user);
  if (role === "admin") return "/dashboard/admin";
  if (role === "teacher") return "/dashboard/teacher";
  return "/dashboard/student";
}

export async function signInEmail(payload: { email: string; password: string }): Promise<any> {
  const res = await authClient.signIn.email({
    email: payload.email.trim(),
    password: payload.password,
  });

  if (res?.error) {
    const rawMsg = res.error.message || "";
    const lower = rawMsg.toLowerCase();
    if (
      lower.includes("invalid email or password") ||
      lower.includes("unauthorized") ||
      lower.includes("user not found") ||
      lower.includes("invalid password")
    ) {
      throw new Error("Correo electrónico o contraseña incorrectos. Si olvidaste tu contraseña, ponte en contacto con tu profesor o administrador para restablecerla.");
    }
    throw new Error(rawMsg || "Error al iniciar sesión.");
  }

  return res?.data;
}

export async function signInSocial(provider: "google"): Promise<void> {
  await authClient.signIn.social({ provider, callbackURL: "/signin" });
}

export async function signUpEmail(payload: {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}): Promise<any> {
  if (payload.confirmPassword !== undefined && payload.password !== payload.confirmPassword) {
    throw new Error("Las contraseñas no coinciden.");
  }
  if (payload.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const name = payload.name?.trim() || payload.email.split("@")[0];
  const res = await authClient.signUp.email({
    email: payload.email.trim(),
    password: payload.password,
    name,
  });

  if (res?.error) {
    const rawMsg = res.error.message || "";
    const lower = rawMsg.toLowerCase();
    if (lower.includes("already exists") || lower.includes("user exists")) {
      throw new Error("Ya existe una cuenta registrada con este correo electrónico.");
    }
    throw new Error(rawMsg || "Error al crear la cuenta.");
  }

  return res?.data;
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}

export function getPostLogoutRedirect(): string {
  return "/signin";
}

export async function changeUserPassword(payload: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}): Promise<void> {
  if (payload.newPassword.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  const res = await authClient.changePassword({
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
    revokeOtherSessions: payload.revokeOtherSessions ?? false,
  });

  if (res?.error) {
    const rawMsg = res.error.message || "";
    const lower = rawMsg.toLowerCase();
    if (lower.includes("invalid password") || lower.includes("invalid_password")) {
      throw new Error("La contraseña actual es incorrecta.");
    }
    if (lower.includes("password is too short") || lower.includes("password_too_short")) {
      throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
    }
    if (lower.includes("credential account not found") || lower.includes("credential_account_not_found")) {
      throw new Error("Esta cuenta no tiene una contraseña configurada todavía.");
    }
    throw new Error(rawMsg || "Error al cambiar la contraseña.");
  }
}

export async function setUserPassword(payload: {
  newPassword: string;
}): Promise<void> {
  if (payload.newPassword.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const { setUserPasswordAction } = await import("@/features/profile/actions/profileActions");
  await setUserPasswordAction(payload.newPassword);
}


