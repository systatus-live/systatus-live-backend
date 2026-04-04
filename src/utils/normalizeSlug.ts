import removeAccents from "./removeAccents";

/**
 * Normaliza um slug: remove acentos, converte espaços e caracteres especiais em "_"
 */
export default (text: string): string => {
  return removeAccents(text)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}
