import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "Start the Windows local app to connect to models on your computer. No hosted provider API key is required." }, { status: 503 });
}
