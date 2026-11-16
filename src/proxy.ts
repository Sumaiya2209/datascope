import NextAuth from "next-auth";
import { authConfig } from "./lib/auth/config";

const { auth: proxy } = NextAuth(authConfig);

export { proxy };

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/datasets/:path*",
    "/explorer/:path*",
    "/search/:path*",
    "/saved-views/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
