import { TrendMetrics } from './types';

/**
 * Calculates trend metrics safely between current period and previous period.
 * Handles zero previous count without producing Infinity or NaN.
 */
export function calculateTrend(currentCount: number, previousCount: number): TrendMetrics {
  const absoluteChange = currentCount - previousCount;

  if (previousCount === 0) {
    return {
      currentCount,
      previousCount,
      absoluteChange,
      percentageChange: null,
      explanation: currentCount === 0
        ? 'No incidents recorded in current or previous baseline.'
        : `+${currentCount} incident(s) in current period (No previous-period baseline).`,
    };
  }

  const rawPercentage = ((currentCount - previousCount) / previousCount) * 100;
  const percentageChange = Math.round(rawPercentage * 10) / 10;

  const direction = percentageChange > 0 ? '+' : '';
  const explanation = `${direction}${percentageChange}% change (${direction}${absoluteChange} incident(s) relative to previous baseline of ${previousCount}).`;

  return {
    currentCount,
    previousCount,
    absoluteChange,
    percentageChange,
    explanation,
  };
}

export const calculateTrendMetrics = calculateTrend;

