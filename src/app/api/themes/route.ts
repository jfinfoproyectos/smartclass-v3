import { getAvailableThemes } from "@/app/actions/themes";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';


export async function GET() {
  const themes = await getAvailableThemes();
  return NextResponse.json(themes);
}
