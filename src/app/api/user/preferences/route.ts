import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { userPreferencesSchema } from "@/features/admin/server/schemas";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";

const defaultPreferences = userPreferencesSchema.parse({});

async function getUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const [row] = await db
    .select({ preferences: userPreferences.preferences })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const parsed = userPreferencesSchema.safeParse(row?.preferences ?? {});
  return NextResponse.json({
    preferences: parsed.success ? parsed.data : defaultPreferences,
  });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

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

  const parsed = userPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "User preferences are invalid.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(userPreferences)
    .values({
      userId,
      preferences: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        preferences: parsed.data,
        updatedAt: new Date(),
      },
    })
    .returning({ preferences: userPreferences.preferences });

  if (!row) {
    throw new Error("Saving user preferences returned no row.");
  }

  return NextResponse.json({
    preferences: userPreferencesSchema.parse(row.preferences),
  });
}
