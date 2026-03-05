const { z } = require('zod');

const schemaCreateService = z.object({
  name: z.string().trim().min(2, 'Nome do serviço é obrigatório.').max(120),
  description: z.string().trim().max(500).optional().default(''),
  price: z.coerce.number().min(0, 'Preço inválido.'),
  duration_minutes: z.coerce.number().int('Duração inválida.').min(5).max(720),
});

const schemaUpdateService = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().min(5).max(720).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Envie ao menos um campo para atualização.',
});

module.exports = {
  schemaCreateService,
  schemaUpdateService,
};
