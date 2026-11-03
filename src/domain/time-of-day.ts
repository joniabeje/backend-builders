const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/** Minutes since midnight for "HH:mm" or "HH:mm:ss", or null if the value is not a valid time. */
export function parseTimeOfDay(value: string): number | null {
  const match = TIME_OF_DAY.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
