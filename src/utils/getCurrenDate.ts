import momentTz from "moment-timezone";

export default function getCurrentDate() {
  return momentTz().tz("America/Sao_Paulo");
}