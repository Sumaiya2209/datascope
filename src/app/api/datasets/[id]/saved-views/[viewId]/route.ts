import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  authorizeSavedViewDataset,
  getSavedViewId,
  isDatasetAccessResult,
  parseRequestBody,
} from "@/features/saved-views/server/access";
import { updateSavedViewSchema } from "@/features/saved-views/server/schemas";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { savedViews, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string; viewId: string }>;
};

type AuthorizedMutation =
  | {
      userId: string;
      datasetId: string;
      viewId: string;
      ownerId: string;
    }
  | { response: NextResponse };

async function authorizeMutation(
  datasetId: string,
  rawViewId: string,
): Promise<AuthorizedMutation> {
  const access = await authorizeSavedViewDataset(datasetId, "edit");
  if (!isDatasetAccessResult(access)) {
    return access;
  }

  const parsedViewId = getSavedViewId(rawViewId);
  if (!parsedViewId.valid) {
    return parsedViewId;
  }

  const [view] = await db
    .select({ id: savedViews.id, ownerId: savedViews.userId })
    .from(savedViews)
    .where(
      and(
        eq(savedViews.datasetId, access.datasetId),
        eq(savedViews.id, parsedViewId.viewId),
      ),
    )
    .limit(1);

  if (!view) {
    return {
      response: NextResponse.json(
        { error: "Saved view was not found.", code: "NOT_FOUND" },
        { status: 404 },
      ),
    };
  }

  if (view.ownerId !== access.userId) {
    try {
      await requireDatasetAccess(access.userId, access.datasetId, "manage");
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return {
          response: NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.code === "UNAUTHENTICATED" ? 401 : 403 },
          ),
        };
      }

      throw error;
    }
  }

  return {
    ...access,
    viewId: parsedViewId.viewId,
    ownerId: view.ownerId,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, viewId } = await context.params;
  const access = await authorizeMutation(id, viewId);

  if ("response" in access) {
    return access.response;
  }

  const input = await parseRequestBody(request);
  if (input instanceof Response) {
    return input;
  }

  const parsedChanges = updateSavedViewSchema.safeParse(input);
  if (!parsedChanges.success) {
    return NextResponse.json(
      {
        error: "Saved view changes are invalid.",
        details: parsedChanges.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsedChanges.data.name) {
    const [existingView] = await db
      .select({ id: savedViews.id })
      .from(savedViews)
      .where(
        and(
          eq(savedViews.datasetId, access.datasetId),
          eq(savedViews.userId, access.ownerId),
          eq(savedViews.name, parsedChanges.data.name),
        ),
      )
      .limit(1);

    if (existingView && existingView.id !== access.viewId) {
      return NextResponse.json(
        { error: "A saved view with this name already exists." },
        { status: 409 },
      );
    }
  }

  const [view] = await db
    .update(savedViews)
    .set({ ...parsedChanges.data, updatedAt: new Date() })
    .where(
      and(
        eq(savedViews.datasetId, access.datasetId),
        eq(savedViews.id, access.viewId),
      ),
    )
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
      { error: "Saved view was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, access.ownerId))
    .limit(1);

  if (!owner) {
    throw new Error("The saved view owner could not be loaded.");
  }

  return NextResponse.json({ view: { ...view, ownerName: owner.name } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, viewId } = await context.params;
  const access = await authorizeMutation(id, viewId);

  if ("response" in access) {
    return access.response;
  }

  const [deletedView] = await db
    .delete(savedViews)
    .where(
      and(
        eq(savedViews.datasetId, access.datasetId),
        eq(savedViews.id, access.viewId),
      ),
    )
    .returning({ id: savedViews.id });

  if (!deletedView) {
    return NextResponse.json(
      { error: "Saved view was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return new Response(null, { status: 204 });
}
