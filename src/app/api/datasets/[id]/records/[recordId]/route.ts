import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { datasetRecords } from "@/lib/db/schema";
import {
  authorizeRecordRequest,
  datasetRecordSelection,
} from "@/features/record-details/server/record-access";

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
    .select(datasetRecordSelection)
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

  return NextResponse.json({ record });
}
