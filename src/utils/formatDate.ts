import * as momentTz from "moment-timezone";

export default function formatDate(date: string, format: string, mask = null) {
  if (mask) {
    return momentTz(date, mask).format(format);
  }
  return momentTz(new Date(date), false).format(format);
}