import { NextResponse } from "next/server";
import { v2momData } from "@/lib/v2mom-data";

export async function GET() {
  return NextResponse.json(v2momData);
}
