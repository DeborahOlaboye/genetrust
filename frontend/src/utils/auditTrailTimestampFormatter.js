export function formatAuditTimestamp(timestamp) {
  if (timestamp == null || Number.isNaN(Number(timestamp))) {
    return 'Unknown time';
  }

  const now = Date.now();
  const eventTime =
    timestamp instanceof Date
      ? timestamp.valueOf()
      : typeof timestamp === 'string'
      ? Number(timestamp)
      : timestamp;

  if (Number.isNaN(eventTime) || eventTime <= 0) {
    return 'Unknown time';
  }

  const diffMs = Math.max(0, now - eventTime);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ${diffMinutes % 60}m ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h ago`;
}
