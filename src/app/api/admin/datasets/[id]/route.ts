import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdminAccess,
  parseAdminRequestBody,
} from "@/features/admin/server/access";
import { setRoleGrants } from "@/features/admin/server/dataset-permissions";
import { datasetUpdateSchema } from "@/features/admin/server/schemas";
import { db } from "@/lib/db";
import { datasets } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function createSlug(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 220) || "dataset"
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const { id } = await context.params;
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Dataset id must be a UUID." },
      { status: 400 },
    );
  }

  const body = await parseAdminRequestBody(request);
  if (body instanceof Response) {
    return body;
  }
  const parsed = datasetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dataset changes are invalid.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const updated = await db.transaction(async (transaction) => {
      const { permissions, ...changes } = parsed.data;
      const updateValues = {
        ...changes,
        ...(changes.name ? { slug: createSlug(changes.name) } : {}),
        updatedAt: new Date(),
      };
      const [dataset] = await transaction
        .update(datasets)
        .set(updateValues)
        .where(eq(datasets.id, parsedId.data))
        .returning({
          id: datasets.id,
          name: datasets.name,
          slug: datasets.slug,
          description: datasets.description,
          category: datasets.category,
          dataSource: datasets.dataSource,
          recordCount: datasets.recordCount,
          createdAt: datasets.createdAt,
          updatedAt: datasets.updatedAt,
        });

      if (!dataset) {
        return null;
      }

      if (permissions) {
        await setRoleGrants(transaction, dataset.id, {
          analyst: permissions.analyst ?? null,
          viewer: permissions.viewer ?? null,
        });
      }

      return dataset;
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Dataset was not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      dataset: updated,
      permissions: parsed.data.permissions,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A dataset with a similar name already exists." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const { id } = await context.params;
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Dataset id must be a UUID." },
      { status: 400 },
    );
  }

  const [deleted] = await db
    .delete(datasets)
    .where(eq(datasets.id, parsedId.data))
    .returning({ id: datasets.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Dataset was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return new Response(null, { status: 204 });
}
