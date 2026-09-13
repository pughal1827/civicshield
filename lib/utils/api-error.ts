import { NextResponse } from 'next/server';

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface APISuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export function createErrorResponse(
  message: string,
  code: string = 'INTERNAL_SERVER_ERROR',
  status: number = 500,
  details?: unknown
) {
  return NextResponse.json<APIErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>
) {
  return NextResponse.json<APISuccessResponse<T>>(
    {
      success: true,
      data,
      meta,
    },
    { status }
  );
}
