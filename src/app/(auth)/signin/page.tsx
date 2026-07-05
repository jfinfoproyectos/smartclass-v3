import SignIn from "@/features/auth/components/SignIn";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <SignIn/>
    </Suspense>
  );
}
