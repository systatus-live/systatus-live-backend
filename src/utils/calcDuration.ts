import formatSince from './formatSince';
import momentTz from "moment-timezone";

export default function calcDuration(created_at: string, ended_at: string | null): string {
  if (ended_at) {
    return formatSince(created_at, "YYYY-MM-DD HH:mm:ssZ", momentTz(ended_at, "YYYY-MM-DD HH:mm:ssZ"));
  }
  return formatSince(created_at, "YYYY-MM-DD HH:mm:ssZ");
}
