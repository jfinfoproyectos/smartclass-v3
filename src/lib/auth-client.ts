import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, adminClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient()
  ]
});

// Exportar hooks útiles
export const { 
  useSession, 
  signIn, 
  signOut, 
  signUp 
} = authClient;