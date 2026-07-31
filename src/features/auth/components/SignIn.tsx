"use client";

import React, { JSX, SVGProps, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Eye, EyeOff, Lock, Mail, BrainCircuit, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getRedirectForSession, signInEmail, signInSocial } from "@/features/auth/services/authService";

const GoogleIcon = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export default function SignIn() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const target = getRedirectForSession(session);
    if (target) router.replace(target);
  }, [session, router]);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleEmailSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInEmail({ email, password });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInSocial("google");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error con autenticación social";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-white overflow-hidden p-4">
      {/* AI Canvas Ambient Lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-cyan-500/0 blur-[130px] opacity-70 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-t from-blue-500/10 to-transparent blur-[120px]" />

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
              Bienvenido de nuevo
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Inicia sesión para acceder a tu panel, ajustes y proyectos.
            </p>
          </div>

          <div className="space-y-5">
            {/* Social Button */}
            <Button
              variant="outline"
              className="w-full h-11 justify-center gap-2.5 rounded-xl border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200 text-sm font-medium transition-all"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleIcon className="h-4 w-4 text-white" />
              Iniciar sesión con Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1 bg-slate-800" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                o con email
              </span>
              <Separator className="flex-1 bg-slate-800" />
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEmailSignIn();
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
                {loading ? "Cargando..." : "Iniciar sesión"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              ¿No tienes cuenta?{" "}
              <Link href="/signup" className="text-emerald-400 font-semibold hover:underline">
                Crear una cuenta
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
