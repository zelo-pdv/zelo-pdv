import { NextResponse } from "next/server";
import { deleteAuthCookies } from "@/lib/cookies";

export async function POST() {
  await deleteAuthCookies();
  return NextResponse.json({ success: true });
}
