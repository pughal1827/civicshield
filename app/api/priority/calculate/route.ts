import { NextRequest } from 'next/server';
import { z } from 'zod';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const priorityCalculationSchema = z.object({
  category: z.enum([
    'ROAD_POTHOLE',
    'GARBAGE_OVERFLOW',
    'BROKEN_STREETLIGHT',
    'WATER_LEAKAGE',
    'DRAINAGE_BLOCKAGE',
    'TRAFFIC_SIGNAL_DAMAGED',
    'PUBLIC_INFRA_DAMAGE',
  ]),
  aiSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  aiSafetyRiskScore: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  addressText: z.string().optional(),
  reportCount: z.number().int().min(1).default(1),
  affectedCitizensCount: z.number().int().min(1).default(1),
  recurrenceCountInArea: z.number().int().min(0).default(0),
  isNearSensitiveLocation: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = priorityCalculationSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse(
        'Invalid priority calculation request payload.',
        'VALIDATION_ERROR',
        400,
        parseResult.error.format()
      );
    }

    const priorityResult = calculatePriorityScore(parseResult.data);

    return createSuccessResponse(priorityResult);
  } catch (error) {
    console.error('[API /api/priority/calculate] Unhandled exception:', error);
    return createErrorResponse(
      'An unexpected error occurred during priority calculation.',
      'PRIORITY_CALCULATION_ERROR',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
