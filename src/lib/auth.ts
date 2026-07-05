import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import prisma from "./prisma";



export const auth = betterAuth({
  // Configuración de base de datos
  database: prismaAdapter(prisma, {
    provider: "postgresql", // o "mysql" o "sqlite"
  }),

  // Campos adicionales del usuario expuestos en sesión
  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },

  // Configuración de email y contraseña
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Proveedores sociales
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
  },

  // Configuración de sesión
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // Actualizar cada 24 horas
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutos
    },
  },

  // Plugin para manejar cookies en Next.js
  plugins: [
    nextCookies(),
    admin({ defaultRole: "student" })
  ],
});