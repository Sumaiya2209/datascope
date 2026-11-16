import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "@/lib/auth/permissions";
import { datasetRecords } from "@/lib/db/schema";

type RecordPathParams = {
  datasetId: string;
  recordId: string;
};

export type RecordAccessResult =
  | {
      authorized: true;
      datasetId: string;
      recordId: string;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

export const datasetRecordSelection = {
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
};

const uuidSchema = z.uuid();

function authorizationResponse(error: AuthorizationError) {
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

export async function authorizeRecordRequest({
  datasetId,
  recordId,
}: RecordPathParams): Promise<RecordAccessResult> {
  if (!uuidSchema.safeParse(datasetId).success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Dataset id must be a UUID." },
        { status: 400 },
      ),
    };
  }

  if (!uuidSchema.safeParse(recordId).success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Record id must be a UUID." },
        { status: 400 },
      ),
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
        { status: 401 },
      ),
    };
  }

  try {
    await requireDatasetAccess(userId, datasetId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        authorized: false,
        response: authorizationResponse(error),
      };
    }

    throw error;
  }

  return { authorized: true, datasetId, recordId };
}
