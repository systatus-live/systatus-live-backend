import * as momentTz from "moment-timezone";

export default function formatDate(date: string, outputFormat: string, inputFormat: string | null = null) {
  if (inputFormat) {
    return momentTz(date, inputFormat).format(outputFormat);
  }
  return momentTz(new Date(date), false).format(outputFormat);
}