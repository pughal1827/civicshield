import { TimeWindow, TimeWindowType } from './types';

export function getTimeWindow(windowType: TimeWindowType = 'last30Days'): TimeWindow {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  let name = 'Last 30 Days';

  switch (windowType) {
    case 'today':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      name = 'Today (UTC)';
      break;

    case 'yesterday':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));
      name = 'Yesterday (UTC)';
      break;

    case 'last7Days':
      start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      name = 'Last 7 Days';
      break;

    case 'previous7Days':
      start = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      end = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      name = 'Previous 7 Days Comparison';
      break;

    case 'last30Days':
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      name = 'Last 30 Days';
      break;

    case 'previous30Days':
      start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      end = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      name = 'Previous 30 Days Comparison';
      break;

    case 'currentMonth':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      name = 'Current Month';
      break;

    case 'previousMonth':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      name = 'Previous Month';
      break;

    default:
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      name = 'Last 30 Days';
  }

  return {
    type: windowType,
    name,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}
