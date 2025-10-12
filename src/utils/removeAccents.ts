/**
 * Remove acentos do texto fornecido
 */
export default (text: string): string => {
  return text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}