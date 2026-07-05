"use server";

import { cookies } from "next/headers";

export async function setCodeTheme(themeId: string) {
  const cookieStore = await cookies();
  cookieStore.set("code-theme", themeId, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function getCodeTheme() {
  const cookieStore = await cookies();
  const themeFromCookie = cookieStore.get("code-theme")?.value;

  return themeFromCookie || "one-dark-pro";
}
