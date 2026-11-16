import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  setRoleGrants,
  type RoleGrants,
} from "@/features/admin/server/dataset-permissions";
import {
  requireAdminAccess,
  parseAdminRequestBody,
} from "@/features/admin/server/access";
import { datasetCreateSchema } from "@/features/admin/server/schemas";
import { db } from "@/lib/db";
import { accessPermissions, datasets, roles } from "@/lib/db/schema";

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

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const [datasetRows, roleRows] = await Promise.all([
    db
      .select({
        id: datasets.id,
        name: datasets.name,
        slug: datasets.slug,
        description: datasets.description,
        category: datasets.category,
        dataSource: datasets.dataSource,
        recordCount: datasets.recordCount,
        createdAt: datasets.createdAt,
        updatedAt: datasets.updatedAt,
      })
      .from(datasets)
      .orderBy(asc(datasets.name)),
    db
      .select({
        datasetId: accessPermissions.datasetId,
        role: roles.slug,
        permission: accessPermissions.permission,
      })
      .from(accessPermissions)
      .innerJoin(roles, eq(accessPermissions.roleId, roles.id))
      .where(inArray(roles.slug, ["analyst", "viewer"])),
  ]);

  const permissionsByDataset = new Map<string, RoleGrants>();
  for (const grant of roleRows) {
    const grants = permissionsByDataset.get(grant.datasetId) ?? {
      analyst: null,
      viewer: null,
    };
    if (grant.role === "analyst" || grant.role === "viewer") {
      grants[grant.role] = grant.permission;
    }
    permissionsByDataset.set(grant.datasetId, grants);
  }

  return NextResponse.json({
    datasets: datasetRows.map((dataset) => ({
      ...dataset,
      permissions: permissionsByDataset.get(dataset.id) ?? {
        analyst: null,
        viewer: null,
      },
    })),
  });
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const body = await parseAdminRequestBody(request);
  if (body instanceof Response) {
    return body;
  }
  const parsed = datasetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dataset details are invalid.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const dataset = await db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(datasets)
        .values({
          createdBy: access.userId,
          name: parsed.data.name,
          slug: createSlug(parsed.data.name),
          description: parsed.data.description ?? null,
          category: parsed.data.category ?? null,
          dataSource: parsed.data.dataSource ?? null,
        })
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

      if (!created) {
        throw new Error("Dataset creation returned no dataset.");
      }

      await setRoleGrants(transaction, created.id, {
        analyst: parsed.data.permissions?.analyst ?? null,
        viewer: parsed.data.permissions?.viewer ?? null,
      });

      return created;
    });

    return NextResponse.json(
      {
        dataset,
        permissions: parsed.data.permissions ?? {
          analyst: null,
          viewer: null,
        },
      },
      { status: 201 },
    );
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
