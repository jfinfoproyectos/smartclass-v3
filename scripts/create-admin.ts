/**
 * Script para crear o promover un usuario administrador en SmartClass.
 *
 * Modos de ejecución:
 * 
 * 1. Con Variables de Entorno (Recomendado):
 *    Define en tu archivo .env o .env.local:
 *      ADMIN_NAME="Administrador SmartClass"
 *      ADMIN_EMAIL="admin@smartclass.edu.co"
 *      ADMIN_PASSWORD="AdminPassword123*"
 *    Y ejecuta:
 *      npm run create-admin
 *
 * 2. Con Argumentos CLI (CI/CD / Terminal):
 *    npm run create-admin -- --email admin@ejemplo.com --name "Admin" --password "miPassword123"
 *
 * 3. Modo Interactivo (Si no hay variables ni argumentos):
 *    npm run create-admin
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as readline from "readline";

// ─── Cargar .env y .env.local ────────────────────────────────────────────────
const __filename_url = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_url);
const rootDir = resolve(__dirname_local, "..");

function loadEnv() {
  const envFiles = [".env", ".env.local"];
  for (const file of envFiles) {
    try {
      const envPath = resolve(rootDir, file);
      if (!existsSync(envPath)) continue;
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key] || process.env[key] === "") {
          process.env[key] = val;
        }
      }
    } catch {
      // Ignorar errores de lectura de archivo
    }
  }
}

// ─── Parsear Argumentos CLI ──────────────────────────────────────────────────
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

// ─── Prompts Interactivos ───────────────────────────────────────────────────
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

// ─── Ejecución Principal ─────────────────────────────────────────────────────
async function main() {
  loadEnv();

  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║         SmartClass — Crear Usuario Administrador        ║");
  console.log("╚═════════════════════════════════════════════════════════╝\n");

  const cli = parseArgs();

  // Prioridad: 1. Argumentos CLI -> 2. Variables de Entorno -> 3. Consola Interactiva
  let email = cli.email || process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL;
  let name = cli.name || process.env.ADMIN_NAME || process.env.INITIAL_ADMIN_NAME;
  let password = cli.password || process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;

  const usedEnv = !cli.email && !!(process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL);

  if (usedEnv) {
    console.log("🌱 Variables de entorno detectadas (.env):");
    console.log(`   • ADMIN_EMAIL: ${email}`);
    console.log(`   • ADMIN_NAME : ${name || "(Por defecto: Administrador SmartClass)"}`);
    console.log(`   • ADMIN_PASSWORD: ${password ? "********" : "(No configurada)"}\n`);
  }

  // Si falta alguno, solicitar de forma interactiva
  if (!email) {
    email = await promptText("📧 Correo electrónico del administrador: ");
  }
  if (!name) {
    if (usedEnv) {
      name = "Administrador SmartClass";
    } else {
      name = await promptText("👤 Nombre completo: ");
    }
  }
  if (!password) {
    password = await promptPassword("🔑 Contraseña (mín. 8 caracteres): ");
  }

  // Validaciones mínimas
  if (!name || !email || !password) {
    console.error("\n❌ Todos los campos son obligatorios (nombre, correo y contraseña).\n");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("\n❌ El correo electrónico proporcionado no tiene un formato válido.\n");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("\n❌ La contraseña debe tener al menos 8 caracteres.\n");
    process.exit(1);
  }

  console.log("\n⏳ Conectando a la base de datos...");

  // Import dinámico para asegurar que .env ya fue precargado
  const authPath = pathToFileURL(resolve(rootDir, "src/lib/auth.ts")).href;
  const prismaPath = pathToFileURL(resolve(rootDir, "src/lib/prisma.ts")).href;

  const { auth } = await import(authPath);
  const { default: prisma } = await import(prismaPath);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`\nℹ️  El usuario con correo "${email}" ya existe y ya tiene el rol de Administrador ("admin").`);
        console.log(`   ID de Usuario : ${existing.id}`);
        console.log(`   Estado        : Activo`);
        console.log("\n🚀 Ya puedes iniciar sesión directamente en: /signin\n");
        process.exit(0);
      } else {
        console.log(`\n🔄 El usuario con correo "${email}" ya existe en la base de datos con rol: "${existing.role || "student"}".`);
        console.log(`⏳ Actualizando permisos a rol "admin" y verificando correo...`);

        await prisma.user.update({
          where: { email },
          data: {
            role: "admin",
            emailVerified: true,
          }
        });

        console.log("\n🎉 ¡Usuario promovido exitosamente a Administrador!");
        console.log(`   👤 Nombre : ${existing.name}`);
        console.log(`   📧 Correo : ${email}`);
        console.log(`   🔐 Nuevo Rol : admin`);
        console.log("\n🚀 Ya puedes iniciar sesión en: /signin\n");
        process.exit(0);
      }
    }

    // Si el usuario no existe, crear la cuenta con Better Auth (hashing seguro de contraseña)
    console.log(`⏳ Registrando nuevo administrador con Better Auth...`);
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      }
    });

    // Asignar rol admin y marcar como verificado en la tabla de usuarios
    await prisma.user.update({
      where: { email },
      data: {
        role: "admin",
        emailVerified: true,
      }
    });

    console.log("\n✅ ¡Usuario Administrador creado exitosamente!");
    console.log(`   👤 Nombre : ${name}`);
    console.log(`   📧 Correo : ${email}`);
    console.log(`   🔐 Rol    : admin`);
    console.log("\n🚀 Ya puedes iniciar sesión en: /signin\n");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Ocurrió un error al procesar el usuario administrador:", err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
