import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { datasetFields, datasets } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getAuthorizationResponse(error: AuthorizationError) {
  const status =
    error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "FORBIDDEN"
        ? 403
        : 404;

  return NextResponse.json(
    { error: error.message, code: error.code },
    { status },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Dataset id must be a UUID." },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    await requireDatasetAccess(userId, parsedId.data);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return getAuthorizationResponse(error);
    }

    throw error;
  }

  const [dataset] = await db
    .select({
      id: datasets.id,
      name: datasets.name,
      slug: datasets.slug,
      description: datasets.description,
      category: datasets.category,
      recordCount: datasets.recordCount,
    })
    .from(datasets)
    .where(eq(datasets.id, parsedId.data))
    .limit(1);

  if (!dataset) {
    return NextResponse.json(
      { error: "Dataset was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const fields = await db
    .select({
      id: datasetFields.id,
      datasetId: datasetFields.datasetId,
      name: datasetFields.name,
      label: datasetFields.label,
      dataType: datasetFields.dataType,
      isSearchable: datasetFields.isSearchable,
      isFilterable: datasetFields.isFilterable,
      isSortable: datasetFields.isSortable,
      position: datasetFields.position,
    })
    .from(datasetFields)
    .where(eq(datasetFields.datasetId, parsedId.data))
    .orderBy(asc(datasetFields.position), asc(datasetFields.name));

  return NextResponse.json({ dataset: { ...dataset, fields } });
}
