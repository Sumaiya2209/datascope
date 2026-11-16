import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import {
  AuthorizationError,
  requireDatasetAccess,
  type DatasetPermission,
} from "@/lib/auth/permissions";

type DatasetAccessResult =
  | {
      userId: string;
      datasetId: string;
    }
  | {
      response: NextResponse;
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

export async function authorizeSavedViewDataset(
  rawDatasetId: string,
  permission: DatasetPermission,
): Promise<DatasetAccessResult> {
  const parsedDatasetId = z.uuid().safeParse(rawDatasetId);

  if (!parsedDatasetId.success) {
    return {
      response: NextResponse.json(
        { error: "Dataset id must be a UUID." },
        { status: 400 },
      ),
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
        { status: 401 },
      ),
    };
  }

  try {
    await requireDatasetAccess(userId, parsedDatasetId.data, permission);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { response: getAuthorizationResponse(error) };
    }

    throw error;
  }

  return { userId, datasetId: parsedDatasetId.data };
}

export async function parseRequestBody(
  request: Request,
): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    throw error;
  }
}

export function isDatasetAccessResult(
  result: DatasetAccessResult,
): result is { userId: string; datasetId: string } {
  return "userId" in result;
}

export function getSavedViewId(rawViewId: string) {
  const parsedViewId = z.uuid().safeParse(rawViewId);
  if (!parsedViewId.success) {
    return {
      valid: false as const,
      response: NextResponse.json(
        { error: "Saved view id must be a UUID." },
        {
          status: 400,
        },
      ),
    };
  }

  return { valid: true as const, viewId: parsedViewId.data };
}
