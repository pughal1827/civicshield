import { NextRequest } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { getIntelligenceOverview } from '@/lib/intelligence/aggregations';
import { getEmergencyEscalations } from '@/lib/intelligence/escalation';
import { getDepartmentOperations } from '@/lib/intelligence/departments';
import { detectCivicHotspots } from '@/lib/intelligence/hotspots';
import { detectRecurringProblems } from '@/lib/intelligence/recurring';
import { detectRootCauseSignals } from '@/lib/intelligence/root-causes';
import { getSLAMonitoring } from '@/lib/intelligence/sla';

export async function GET(req: NextRequest) {
  try {
    // 1. Server-Side Session & RBAC Enforcement
    const tokenCookie = req.cookies.get('civicshield_session')?.value;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    const session = getSessionByToken(token);

    if (!session) {
      return createErrorResponse('Authentication required to access Command Center operational data.', 'UNAUTHENTICATED', 401);
    }

    if (session.user.role === 'CITIZEN') {
      return createErrorResponse('Access denied: Operations Command Center is restricted to municipal authority personnel.', 'FORBIDDEN', 403);
    }

    // 2. Query Parameters
    const { searchParams } = new URL(req.url);
    let days = Number(searchParams.get('days')) || 7;
    days = Math.max(1, Math.min(90, days));

    // 3. Parallel Engine Evaluation
    const [
      overview,
      escalations,
      deptOps,
      hotspots,
      recurrences,
      rootCauses,
      slaData,
    ] = await Promise.all([
      getIntelligenceOverview(days <= 7 ? 'last7Days' : 'last30Days'),
      getEmergencyEscalations({ days }),
      getDepartmentOperations(),
      detectCivicHotspots({ days, radius: 500, minIncidents: 3 }),
      detectRecurringProblems({ days: 180, radius: 250, minOccurrences: 3 }),
      detectRootCauseSignals({ days, radius: 500, minIncidents: 2 }),
      getSLAMonitoring({ status: 'ALL' }),
    ]);

    // 4. Action Queue Counts Calculation
    const emergencyReviewCount = escalations.summary.emergencyReviewCount || 0;
    const unassignedCriticalCount = deptOps.totalUnassignedCritical || 0;
    const unassignedHighCount = deptOps.totalUnassignedHigh || 0;
    const slaBreachedCount = slaData.summary.breached || 0;
    const commonCauseCount = rootCauses.signals.filter((s) => s.signalScore >= 60).length;

    const totalActionItems =
      emergencyReviewCount +
      unassignedCriticalCount +
      unassignedHighCount +
      slaBreachedCount +
      commonCauseCount;

    // 5. Structure Response
    const responseData = {
      actionQueue: {
        totalActionItems,
        emergencyReviewCount,
        unassignedCriticalCount,
        unassignedHighCount,
        slaBreachedCount,
        commonCauseCount,
      },
      escalationSummary: escalations.summary,
      urgentAlerts: escalations.alerts.slice(0, 5),
      unassignedCritical: deptOps.unassignedCritical.slice(0, 5),
      unassignedHigh: deptOps.unassignedHigh.slice(0, 5),
      departments: deptOps.departments.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        departmentCode: d.departmentCode,
        activeCount: d.activeCount,
        criticalCount: d.criticalCount,
        highCount: d.highCount,
        slaAtRiskCount: d.slaAtRiskCount,
        slaBreachedCount: d.slaBreachedCount,
        pressureScore: d.pressure.pressureScore,
        pressureClassification: d.pressure.classification,
      })),
      slaSummary: {
        totalTracked: slaData.summary.totalTracked,
        onTrackCount: slaData.summary.onTrack,
        atRiskCount: slaData.summary.atRisk,
        breachedCount: slaData.summary.breached,
      },
      hotspotsSummary: {
        totalHotspots: hotspots.totalHotspots,
        totalClusteredIncidents: hotspots.totalClusteredIncidents,
        topHotspots: hotspots.hotspots.slice(0, 3),
      },
      recurringSummary: {
        totalRecurringProblems: recurrences.totalRecurringProblems,
        topRecurrences: recurrences.recurrences.slice(0, 3),
      },
      rootCausesSummary: {
        totalSignals: rootCauses.totalSignals,
        topSignals: rootCauses.signals.slice(0, 3),
      },
      activityTrend: {
        metrics: overview.metrics,
        trend: overview.trend,
      },
      storageMode: overview.storageMode,
      generatedAt: new Date().toISOString(),
    };

    return createSuccessResponse(responseData);
  } catch (error: any) {
    console.error('[API /api/authority/operations/command-center] System/DB Error:', error);
    return createErrorResponse(
      'Unable to load Command Center operations telemetry right now. Please check system database status.',
      'SERVICE_UNAVAILABLE',
      503
    );
  }
}
