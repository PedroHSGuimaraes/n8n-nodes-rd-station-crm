/**
 * Lista de IDs vinda de um campo do editor.
 *
 * Por que existe: campos como `follower_ids` e `product_ids` são texto separado por vírgula,
 * mas uma expressão do n8n pode devolver uma lista ou um número. Aceitar os três formatos
 * evita o erro `split is not a function` e evita descartar o valor em silêncio.
 */
export function toIdList(value: unknown): string[] {
	// Lista vinda de expressão: cada item vira texto aparado.
	if (Array.isArray(value)) {
		return value.map((item) => String(item).trim()).filter(Boolean);
	}
	// Texto ou número: quebra na vírgula, como o editor sempre fez.
	return String(value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}
