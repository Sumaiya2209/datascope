import { and, asc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  authorizeSavedViewDataset,
  isDatasetAccessResult,
  parseRequestBody,
} from "@/features/saved-views/server/access";
import { createSavedViewSchema } from "@/features/saved-views/server/schemas";
import { db } from "@/lib/db";
import { savedViews, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeSavedViewDataset(id, "view");

  if (!isDatasetAccessResult(access)) {
    return access.response;
  }

  const views = await db
    .select({
      id: savedViews.id,
      datasetId: savedViews.datasetId,
      ownerId: savedViews.userId,
      ownerName: users.name,
      name: savedViews.name,
      description: savedViews.description,
      configuration: savedViews.configuration,
      isShared: savedViews.isShared,
      createdAt: savedViews.createdAt,
      updatedAt: savedViews.updatedAt,
    })
    .from(savedViews)
    .innerJoin(users, eq(savedViews.userId, users.id))
    .where(
      and(
        eq(savedViews.datasetId, access.datasetId),
        or(eq(savedViews.userId, access.userId), eq(savedViews.isShared, true)),
      ),
    )
    .orderBy(asc(savedViews.name), asc(savedViews.id));

  return NextResponse.json({ views });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeSavedViewDataset(id, "edit");

  if (!isDatasetAccessResult(access)) {
    return access.response;
  }

  const input = await parseRequestBody(request);
  if (input instanceof Response) {
    return input;
  }

  const parsedInput = createSavedViewSchema.safeParse(input);
  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "Saved view is invalid.",
        details: parsedInput.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [view] = await db
    .insert(savedViews)
    .values({
      userId: access.userId,
      datasetId: access.datasetId,
      ...parsedInput.data,
    })
    .onConflictDoNothing({
      target: [savedViews.userId, savedViews.datasetId, savedViews.name],
    })
    .returning({
      id: savedViews.id,
      datasetId: savedViews.datasetId,
      ownerId: savedViews.userId,
      name: savedViews.name,
      description: savedViews.description,
      configuration: savedViews.configuration,
      isShared: savedViews.isShared,
      createdAt: savedViews.createdAt,
      updatedAt: savedViews.updatedAt,
    });

  if (!view) {
    return NextResponse.json(
      { error: "A saved view with this name already exists." },
      { status: 409 },
    );
  }

  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, access.userId))
    .limit(1);

  if (!owner) {
    throw new Error("The saved view owner could not be loaded.");
  }

  return NextResponse.json(
    { view: { ...view, ownerName: owner.name } },
    { status: 201 },
  );
}
