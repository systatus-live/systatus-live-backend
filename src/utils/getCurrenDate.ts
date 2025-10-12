import * as momentTz from "moment-timezone";

export default function getCurrentDate(format?: string) {
  if (format) {
    return momentTz().tz("America/Sao_Paulo").format(format);
  }
  return momentTz().tz("America/Sao_Paulo").toString();
}