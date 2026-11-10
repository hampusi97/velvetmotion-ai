import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const AGE_COOKIE = "velvet-age-ok";

export function middleware(request: NextRequest) {
  const confirmed = request.cookies.get(AGE_COOKIE)?.value === "yes";
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (!confirmed) {
      return NextResponse.json({ error: "Age confirmation required" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname === "/enter") {
    if (confirmed) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!confirmed) {
    const url = request.nextUrl.clone();
    url.pathname = "/enter";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
