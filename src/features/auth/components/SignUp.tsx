"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Eye, EyeOff, Lock, Mail, BrainCircuit, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getRedirectForSession, signUpEmail } from "@/features/auth/services/authService";

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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-white overflow-hidden p-4">
      {/* AI Canvas Ambient Lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-cyan-500/0 blur-[130px] opacity-70 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-t from-purple-500/10 to-transparent blur-[120px]" />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glassmorphism Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {/* Accent top gradient bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          {/* Header */}
          <div className="space-y-3 text-center">
            <Link href="/" className="inline-flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1 hover:scale-105 transition-transform">
              <BrainCircuit className="w-7 h-7 text-emerald-400" />
            </Link>

            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Crear cuenta
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Regístrate con tu correo y contraseña para acceder al sistema.
            </p>
          </div>

          <div className="space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEmailSignUp();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    className="peer ps-10 h-11 rounded-xl bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                    placeholder="tu@correo.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="text-slate-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-focus:text-emerald-400 transition-colors">
                    <Mail size={17} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    className="ps-10 pe-10 h-11 rounded-xl bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                    placeholder="Ingresa tu contraseña"
                    type={isVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="text-slate-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-focus:text-emerald-400 transition-colors">
                    <Lock size={17} />
                  </div>
                  <button
                    className="text-slate-500 hover:text-slate-300 absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center transition-colors outline-none"
                    type="button"
                    onClick={toggleVisibility}
                    aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-300">
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    className="ps-10 pe-10 h-11 rounded-xl bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                    placeholder="Repite tu contraseña"
                    type={isVisibleConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="text-slate-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 peer-focus:text-emerald-400 transition-colors">
                    <Lock size={17} />
                  </div>
                  <button
                    className="text-slate-500 hover:text-slate-300 absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center transition-colors outline-none"
                    type="button"
                    onClick={toggleVisibilityConfirm}
                    aria-label={isVisibleConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
                  >
                    {isVisibleConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 border-none transition-all hover:scale-[1.01]"
                disabled={loading}
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              ¿Ya tienes cuenta?{" "}
              <Link href="/signin" className="text-emerald-400 font-semibold hover:underline">
                Inicia sesión
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}