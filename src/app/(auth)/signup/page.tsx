import SignUp from "@/features/auth/components/SignUp";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <SignUp />
    </Suspense>
  );
}
