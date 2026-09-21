export const CATEGORY_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  ROAD_POTHOLE:           { color: '#ef4444', label: 'Pothole', icon: '🕳️' },
  DRAINAGE_BLOCKAGE:      { color: '#3b82f6', label: 'Drainage', icon: '🌊' },
  GARBAGE_OVERFLOW:       { color: '#f59e0b', label: 'Garbage', icon: '🗑️' },
  BROKEN_STREETLIGHT:     { color: '#eab308', label: 'Streetlight', icon: '💡' },
  WATER_LEAKAGE:          { color: '#06b6d4', label: 'Water Leak', icon: '💧' },
  ELECTRICAL_HAZARD:      { color: '#f97316', label: 'Electrical', icon: '⚡' },
  OPEN_MANHOLE:           { color: '#a855f7', label: 'Open Manhole', icon: '⚠️' },
  SEWAGE_OVERFLOW:        { color: '#6366f1', label: 'Sewage', icon: '🚰' },
  FLOOD:                  { color: '#0ea5e9', label: 'Flood Risk', icon: '🌧️' },
  ILLEGAL_CONSTRUCTION:   { color: '#ec4899', label: 'Illegal Build', icon: '🏗️' },
  TRAFFIC_SIGNAL_DAMAGED: { color: '#f43f5e', label: 'Traffic Signal', icon: '🚦' },
  PUBLIC_INFRA_DAMAGE:    { color: '#78716c', label: 'Public Infra', icon: '🏛️' },
};

export const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};
