const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function parseLocalDeadline(deadline) {
  if (typeof deadline !== "string") return null;

  const match = deadline.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return null;

  const [, y, mo, d, h, mi, s = "00"] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);

  if (
    month < 1 || month > 12 || day < 1 ||
    hour > 23 || minute > 59 || second > 59
  ) return null;

  const localDate = new Date(0);
  localDate.setUTCFullYear(year, month - 1, day);
  localDate.setUTCHours(hour, minute, second, 0);

  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) return null;

  return new Date(localDate.getTime() - WIB_OFFSET_MS);
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function determineDeadlineCategory(parsedDeadline, now) {
  const remainingTimeMs = parsedDeadline.getTime() - now.getTime();

  if (remainingTimeMs <= 0) return "overdue";
  if (remainingTimeMs < DAY_IN_MS) return "approaching";
  return "normal";
}
