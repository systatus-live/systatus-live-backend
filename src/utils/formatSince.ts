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

  // minutes
  if (diffSec < 3600) {
    return `${d.minutes()}min`;
  }

  // hours
  if (diffSec < 86400) {
    return d.format("h[h] m[min]");
  }

  // days
  if (diffSec < 30 * 86400) {
    return d.format("d[d] h[h] m[min]");
  }

  // months
  if (diffSec < 365 * 86400) {
    return d.format("M[m] d[d] h[h] m[min]");
  }

  // years
  return d.format("y[a] M[m] d[d] h[h] m[min]");
}