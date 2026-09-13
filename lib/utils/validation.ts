import { z } from 'zod';

export const reportSubmissionSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  audioUrl: z.string().url('Invalid audio URL').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  addressText: z.string().min(3, 'Address is required').max(500),
});

export const overrideAIAnalysisSchema = z.object({
  incidentId: z.string().uuid('Invalid incident ID'),
  category: z.enum([
    'ROAD_POTHOLE',
    'GARBAGE_OVERFLOW',
    'BROKEN_STREETLIGHT',
    'WATER_LEAKAGE',
    'DRAINAGE_BLOCKAGE',
    'TRAFFIC_SIGNAL_DAMAGED',
    'PUBLIC_INFRA_DAMAGE',
  ]).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  departmentId: z.string().uuid().optional(),
  reason: z.string().min(5, 'Reason for override is required'),
});

export const duplicateMergeSchema = z.object({
  targetIncidentId: z.string().uuid('Invalid target incident ID'),
  candidateIncidentId: z.string().uuid('Invalid candidate incident ID'),
  reason: z.string().optional(),
});
