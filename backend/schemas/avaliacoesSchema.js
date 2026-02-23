const { z } = require('zod');

const schemaAvaliacao = z.object({
  pedido_id: z.string().cuid('ID do pedido inválido'),
  nota: z.coerce.number().int().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5'),
  comentario: z.string().max(500, 'Comentário muito longo').optional().default(''),
});

module.exports = { schemaAvaliacao };
