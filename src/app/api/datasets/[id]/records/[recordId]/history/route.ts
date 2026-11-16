import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeRecordRequest } from "@/features/record-details/server/record-access";
import { db } from "@/lib/db";
import { datasetRecords, recordHistory, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string; recordId: string }>;
};

const HISTORY_PAGE_SIZE = 50;
const pageSchema = z.coerce.number().int().min(1).max(100_000);

export async function GET(request: Request, context: RouteContext) {
  const { id, recordId } = await context.params;
  const access = await authorizeRecordRequest({ datasetId: id, recordId });

  if (!access.authorized) {
    return access.response;
  }

  const rawPage = new URL(request.url).searchParams.get("page") ?? "1";
  const parsedPage = pageSchema.safeParse(rawPage);

  if (!parsedPage.success) {
    return NextResponse.json(
      { error: "Page must be a positive integer no greater than 100000." },
      { status: 400 },
    );
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

  const page = parsedPage.data;
  const selectedHistory = await db
    .select({
      id: recordHistory.id,
      operation: recordHistory.operation,
      changes: recordHistory.changes,
      createdAt: recordHistory.createdAt,
      changedBy: {
        id: users.id,
        name: users.name,
      },
    })
    .from(recordHistory)
    .leftJoin(users, eq(recordHistory.changedBy, users.id))
    .where(eq(recordHistory.recordId, access.recordId))
    .orderBy(desc(recordHistory.createdAt), desc(recordHistory.id))
    .limit(HISTORY_PAGE_SIZE + 1)
    .offset((page - 1) * HISTORY_PAGE_SIZE);

  const hasMore = selectedHistory.length > HISTORY_PAGE_SIZE;

  return NextResponse.json({
    history: selectedHistory.slice(0, HISTORY_PAGE_SIZE),
    page,
    pageSize: HISTORY_PAGE_SIZE,
    hasMore,
  });
}
