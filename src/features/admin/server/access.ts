import { NextResponse } from "next/server";
import { AuthorizationError, requireRole } from "@/lib/auth/permissions";

export type AdminAccess =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

export async function requireAdminAccess(): Promise<AdminAccess> {
  try {
    const user = await requireRole("admin");
    return { authorized: true, userId: user.id };
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      throw error;
    }

    const status =
      error.code === "UNAUTHENTICATED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
          : 404;

    return {
      authorized: false,
      response: NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      ),
    };
  }
}

export async function parseAdminRequestBody(
  request: Request,
): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    throw error;
  }
}
