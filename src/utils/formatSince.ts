import momentTz from "moment-timezone";
import "moment-duration-format";

export default function formatSince(startDate: string, inputFormat: string, endDate: momentTz.Moment | null = null): string {
  let diffSec = 0;
  if (endDate) {
    diffSec = endDate.diff(momentTz(startDate, inputFormat), "seconds");
  } else {
    diffSec = momentTz().diff(momentTz(startDate, inputFormat), "seconds");
  }
  
  if (diffSec <= 0) return "0s";

  const d = momentTz.duration(diffSec, "seconds");

  // seconds
  if (diffSec < 60) {
    return `${d.seconds()}s`;
  }

  const totalMin = Math.round(diffSec / 60);

  // minutes
  if (diffSec < 3600) {
    return `${totalMin}min`;
  }

  // hours
  if (diffSec < 86400) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  const totalH = Math.round(diffSec / 3600);

  // days
  if (diffSec < 30 * 86400) {
    const days = Math.floor(totalH / 24);
    const h = totalH % 24;
    return h > 0 ? `${days}d ${h}h` : `${days}d`;
  }

  // months
  if (diffSec < 365 * 86400) {
    const totalDays = Math.round(diffSec / 86400);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    return days > 0 ? `${months}m ${days}d` : `${months}m`;
  }

  // years
  const totalDays = Math.round(diffSec / 86400);
  const years = Math.floor(totalDays / 365);
  const remDays = totalDays % 365;
  const months = Math.floor(remDays / 30);
  return months > 0 ? `${years}a ${months}m` : `${years}a`;
}