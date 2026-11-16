import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PostgresError } from "postgres";
import { registrationSchema } from "@/lib/auth/schemas";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

const PASSWORD_HASH_ROUNDS = 12;

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

  const [viewerRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, "viewer"))
    .limit(1);

  if (!viewerRole) {
    throw new Error(
      'The default "viewer" role is missing. Run the database seed first.',
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

    throw error;
  }
}
