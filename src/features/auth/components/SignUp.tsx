"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getRedirectForSession, signUpEmail } from "@/features/auth/services/authService";
import Image from "next/image";

 

export default function SignUp() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isVisibleConfirm, setIsVisibleConfirm] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const target = getRedirectForSession(session);
    if (target) router.replace(target);
  }, [session, router]);

  const toggleVisibility = () => setIsVisible((prev) => !prev);
  const toggleVisibilityConfirm = () => setIsVisibleConfirm((prev) => !prev);

  const handleEmailSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      await signUpEmail({ email, password, confirmPassword });
      router.push("/signin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear la cuenta";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Image src="/logo.svg" alt="Logo" width={64} height={64} className="mx-auto h-16 w-16" />
          <h1 className="text-3xl font-semibold">Crear cuenta</h1>
          <p className="text-muted-foreground">Regístrate con tu correo y contraseña.</p>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">Completa tus datos</span>
            <Separator className="flex-1" />
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="email">Correo</Label>
              <div className="relative mt-2.5">
                <Input
                  id="email"
                  className="peer ps-9"
                  placeholder="tu@correo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Mail size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-2.5">
                <Input
                  id="password"
                  className="ps-9 pe-9"
                  placeholder="Ingresa tu contraseña"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Lock size={16} aria-hidden="true" />
                </div>
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={isVisible}
                  aria-controls="password"
                >
                  {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <div className="relative mt-2.5">
                <Input
                  id="confirm-password"
                  className="ps-9 pe-9"
                  placeholder="Repite tu contraseña"
                  type={isVisibleConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Lock size={16} aria-hidden="true" />
                </div>
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={toggleVisibilityConfirm}
                  aria-label={isVisibleConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
                  aria-pressed={isVisibleConfirm}
                  aria-controls="confirm-password"
                >
                  {isVisibleConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>


            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>

          <Button className="w-full" onClick={handleEmailSignUp} disabled={loading}>
            Crear cuenta
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="text-center text-sm">
            ¿Ya tienes cuenta? {""}
            <Link href="/signin" className="text-primary font-medium hover:underline">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}