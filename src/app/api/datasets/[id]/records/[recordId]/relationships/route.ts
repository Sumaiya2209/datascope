import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authorizeRecordRequest } from "@/features/record-details/server/record-access";
import { db } from "@/lib/db";
import { datasetRecords, recordRelationships } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string; recordId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id, recordId } = await context.params;
  const access = await authorizeRecordRequest({ datasetId: id, recordId });

  if (!access.authorized) {
    return access.response;
  }

  const [record] = await db
    .select({ id: datasetRecords.id })
    .from(datasetRecords)
    .where(
      and(
        eq(datasetRecords.datasetId, access.datasetId),
        eq(datasetRecords.id, access.recordId),
      ),
    )
    .limit(1);

  if (!record) {
    return NextResponse.json(
      { error: "Record was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const [outgoing, incoming] = await Promise.all([
    db
      .select({
        id: recordRelationships.id,
        relationshipType: recordRelationships.relationshipType,
        record: {
          id: datasetRecords.id,
          status: datasetRecords.status,
          country: datasetRecords.country,
          category: datasetRecords.category,
          revenue: datasetRecords.revenue,
          createdAt: datasetRecords.createdAt,
          updatedAt: datasetRecords.updatedAt,
          name: datasetRecords.name,
          email: datasetRecords.email,
          extra: datasetRecords.extra,
        },
      })
      .from(recordRelationships)
      .innerJoin(
        datasetRecords,
        eq(recordRelationships.targetRecordId, datasetRecords.id),
      )
      .where(
        and(
          eq(recordRelationships.sourceRecordId, access.recordId),
          eq(datasetRecords.datasetId, access.datasetId),
        ),
      )
      .orderBy(
        desc(recordRelationships.createdAt),
        asc(recordRelationships.id),
      ),
    db
      .select({
        id: recordRelationships.id,
        relationshipType: recordRelationships.relationshipType,
        record: {
          id: datasetRecords.id,
          status: datasetRecords.status,
          country: datasetRecords.country,
          category: datasetRecords.category,
          revenue: datasetRecords.revenue,
          createdAt: datasetRecords.createdAt,
          updatedAt: datasetRecords.updatedAt,
          name: datasetRecords.name,
          email: datasetRecords.email,
          extra: datasetRecords.extra,
        },
      })
      .from(recordRelationships)
      .innerJoin(
        datasetRecords,
        eq(recordRelationships.sourceRecordId, datasetRecords.id),
      )
      .where(
        and(
          eq(recordRelationships.targetRecordId, access.recordId),
          eq(datasetRecords.datasetId, access.datasetId),
        ),
      )
      .orderBy(
        desc(recordRelationships.createdAt),
        asc(recordRelationships.id),
      ),
  ]);

  return NextResponse.json({
    relationships: [
      ...outgoing.map((relationship) => ({
        ...relationship,
        direction: "outgoing" as const,
      })),
      ...incoming.map((relationship) => ({
        ...relationship,
        direction: "incoming" as const,
      })),
    ],
  });
}
