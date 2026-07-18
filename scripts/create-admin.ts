/**
 * Script para crear un usuario administrador en SmartClass.
 *
 * Uso interactivo:
 *   npm run create-admin
 *
 * Uso con parámetros (no interactivo, útil para CI/CD):
 *   npm run create-admin -- --email admin@ejemplo.com --name "Admin" --password "miPassword123"
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL — Cadena de conexión a PostgreSQL (se lee de .env automáticamente).
 */

import { createRequire } from "module";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as readline from "readline";

// ─── Load .env ───────────────────────────────────────────────────────────────
const __filename_url = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_url);
const rootDir = resolve(__dirname_local, "..");

function loadEnv() {
  try {
    const envPath = resolve(rootDir, ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn("⚠️  No se encontró .env — usando variables de entorno del sistema.");
  }
}

// ─── Parse CLI args ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  return {
    email: get("--email"),
    name: get("--name"),
    password: get("--password"),
  };
}

// ─── Prompt helper ───────────────────────────────────────────────────────────
function promptText(question: string): Promise<string> {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); res(answer.trim()); });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((res) => {
    process.stdout.write(question);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        res(input);
      } else if (char === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += char;
        process.stdout.write("*");
      }
    });
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   SmartClass — Crear Administrador   ║");
  console.log("╚══════════════════════════════════════╝\n");

  let { email, name, password } = parseArgs();

  if (!name)     name     = await promptText("👤 Nombre completo del administrador: ");
  if (!email)    email    = await promptText("📧 Correo electrónico: ");
  if (!password) password = await promptPassword("🔑 Contraseña (mín. 8 caracteres): ");

  // Validaciones
  if (!name || !email || !password) {
    console.error("\n❌ Todos los campos son obligatorios.\n");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("\n❌ El correo electrónico no es válido.\n");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("\n❌ La contraseña debe tener al menos 8 caracteres.\n");
    process.exit(1);
  }

  console.log("\n⏳ Conectando a la base de datos...");

  // Importar Prisma y Auth dinámicamente para que .env ya esté cargado
  const { pathToFileURL } = await import("url");
  const authPath = pathToFileURL(resolve(rootDir, "src/lib/auth.ts")).href;
  const prismaPath = pathToFileURL(resolve(rootDir, "src/lib/prisma.ts")).href;

  const { auth } = await import(authPath);
  const { default: prisma } = await import(prismaPath);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.error(`\n❌ Ya existe un usuario con el correo "${email}" (rol: ${existing.role || "sin rol"}).\n`);
      process.exit(1);
    }

    // Usar la API de Better Auth para crear el usuario con el hashing correcto (scrypt)
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      }
    });

    // Actualizar el rol a admin y marcar el correo como verificado
    await prisma.user.update({
      where: { email },
      data: {
        role: "admin",
        emailVerified: true,
      }
    });

    console.log("\n✅ Administrador creado exitosamente:");
    console.log(`   👤 Nombre : ${name}`);
    console.log(`   📧 Correo : ${email}`);
    console.log(`   🔐 Rol    : admin`);
    console.log("\n🚀 Ya puedes iniciar sesión en /signin\n");
  } catch (err: any) {
    console.error("\n❌ Error al crear el administrador:", err.message || err);
    process.exit(1);
  }
}

main();
