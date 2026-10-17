/** Puntuación que se elimina de la frase: . , ; : ? ! */
const PUNCTUATION_PATTERN = /[.,;:?!]/gu;

/**
 * Normaliza y tokeniza la frase del usuario antes de enviarla a CYK.
 *
 * - Pasa a minúsculas y elimina `. , ; : ? !`.
 * - Cualquier secuencia de espacios, tabulaciones o saltos de línea es un
 *   único separador.
 * - Conserva palabras desconocidas, paréntesis y operadores como `+` y `*`.
 * - Devuelve `[]` si la entrada está vacía o solo tiene puntuación.
 *
 * No valida la gramática ni decide si la frase pertenece al lenguaje.
 */
export function tokenizeSentence(input: string): string[] {
	const normalized = input.toLowerCase().replace(PUNCTUATION_PATTERN, '').trim();

	if (normalized === '') return [];

	return normalized.split(/\s+/u);
}