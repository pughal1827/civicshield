import { NextRequest } from 'next/server';
import { getWorkersByDepartment } from '@/lib/auth/session';
import { createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentCode = searchParams.get('department') || searchParams.get('departmentCode') || '';
    
    const workers = getWorkersByDepartment(departmentCode || undefined);
    return createSuccessResponse({ workers });
  } catch (error) {
    return createSuccessResponse({ workers: [] });
  }
}
