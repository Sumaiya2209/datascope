import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PostgresError } from "postgres";
import { registrationSchema } from "@/lib/auth/schemas";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

const PASSWORD_HASH_ROUNDS = 12;

function databaseErrorResponse(error: unknown) {
  const code = error instanceof PostgresError ? error.code : undefined;
  console.error("Registration database operation failed.", {
    errorType: error instanceof Error ? error.name : "UnknownError",
    code,
  });

  if (code === "42P01") {
    return NextResponse.json(
      {
        error:
          "The database schema is not initialized. Run npm run db:migrate and npm run db:seed, then try again.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Registration is temporarily unavailable because the database could not be reached. Please try again later.",
    },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    throw error;
  }

  const parsedBody = registrationSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Registration details are invalid.",
        fields: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  let viewerRole: { id: string } | undefined;
  try {
    [viewerRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.slug, "viewer"))
      .limit(1);
  } catch (error) {
    return databaseErrorResponse(error);
  }

  if (!viewerRole) {
    return NextResponse.json(
      {
        error:
          'The "viewer" role is not configured. Run npm run db:seed, then try again.',
      },
      { status: 503 },
    );
  }

  const passwordHash = await hash(
    parsedBody.data.password,
    PASSWORD_HASH_ROUNDS,
  );

  try {
    const [user] = await db
      .insert(users)
      .values({
        roleId: viewerRole.id,
        email: parsedBody.data.email,
        name: parsedBody.data.name,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    if (!user) {
      throw new Error("User registration returned no user.");
    }

    return NextResponse.json(
      { user: { ...user, role: "viewer" } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof PostgresError &&
      error.code === "23505" &&
      error.constraint_name === "users_email_uidx"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    return databaseErrorResponse(error);
  }
}
