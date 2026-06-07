/**
 * Duration in minutes a read notification stays visible before being purged
 * from the database. Change this value to adjust the retention.
 */
export const READ_NOTIFICATION_RETENTION_MINUTES = 10;

export const computeReadCutoffIso = (
  retentionMinutes: number = READ_NOTIFICATION_RETENTION_MINUTES,
): string => {
  const cutoff = new Date(Date.now() - retentionMinutes * 60_000);
  return cutoff.toISOString();
};
