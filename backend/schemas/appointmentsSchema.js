const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const schemaCreateAppointment = z.object({
  service_id: z.string().cuid('Serviço inválido.'),
  date: z.string().regex(dateRegex, 'Data inválida. Use YYYY-MM-DD.'),
  time: z.string().regex(timeRegex, 'Hora inválida. Use HH:mm.'),
});

const schemaProviderAction = z.object({
  action: z.enum(['accept', 'reject', 'counter_offer']),
  new_time: z.string().regex(timeRegex, 'Hora inválida. Use HH:mm.').optional(),
}).superRefine((payload, ctx) => {
  if (payload.action === 'counter_offer' && !payload.new_time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Novo horário é obrigatório na contraproposta.' });
  }
});

const schemaClientResponse = z.object({
  action: z.enum(['accept', 'reject']),
});

module.exports = {
  schemaCreateAppointment,
  schemaProviderAction,
  schemaClientResponse,
};
