import momentTz, { Moment } from "moment-timezone";

export default function formatDate(date: Moment | string, outputFormat: string, inputFormat: string | null = null) {
  momentTz.locale("pt-br");

  let d = date;
  if (typeof d == "string") {
    d = momentTz(d).tz("America/Sao_Paulo");
  }
  if (inputFormat) {
    return momentTz(d, inputFormat).tz("America/Sao_Paulo").format(outputFormat);
  }
  return momentTz(d, false).tz("America/Sao_Paulo").format(outputFormat);
}