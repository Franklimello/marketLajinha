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

const schemaCancelAppointment = z.object({
  reason: z.string().trim().max(240, 'Motivo deve ter até 240 caracteres.').optional(),
});

const schemaProviderSlotUpdate = z.object({
  date: z.string().regex(dateRegex, 'Data inválida. Use YYYY-MM-DD.'),
  time: z.string().regex(timeRegex, 'Hora inválida. Use HH:mm.'),
  occupied: z.boolean(),
});

const schemaProviderDayOccupancyUpdate = z.object({
  date: z.string().regex(dateRegex, 'Data inválida. Use YYYY-MM-DD.'),
  occupied: z.boolean(),
});

const schemaProviderDefaultScheduleUpdate = z.object({
  start_time: z.string().regex(timeRegex, 'Hora inicial inválida. Use HH:mm.'),
  end_time: z.string().regex(timeRegex, 'Hora final inválida. Use HH:mm.'),
  date_from: z.string().regex(dateRegex, 'Data inicial inválida. Use YYYY-MM-DD.').optional(),
  date_to: z.string().regex(dateRegex, 'Data final inválida. Use YYYY-MM-DD.').optional(),
  except_sunday: z.boolean().optional().default(true),
  workdays_mode: z.enum(['SEG_SEX', 'SEG_SAB', 'TODOS']).optional(),
});

const schemaProviderRestoreDefaultSchedule = z.object({
  date_from: z.string().regex(dateRegex, 'Data inicial inválida. Use YYYY-MM-DD.'),
  date_to: z.string().regex(dateRegex, 'Data final inválida. Use YYYY-MM-DD.'),
  blocked_slots: z.array(z.object({
    date: z.string().regex(dateRegex, 'Data inválida. Use YYYY-MM-DD.'),
    time: z.string().regex(timeRegex, 'Hora inválida. Use HH:mm.'),
  })).max(10000, 'Limite de 10.000 bloqueios por restauração.'),
});

const schemaAvailableSlotsQuery = z.object({
  service_id: z.string().cuid('Serviço inválido.'),
  date: z.string().regex(dateRegex, 'Data inválida. Use YYYY-MM-DD.'),
});

module.exports = {
  schemaCreateAppointment,
  schemaProviderAction,
  schemaClientResponse,
  schemaCancelAppointment,
  schemaProviderSlotUpdate,
  schemaProviderDayOccupancyUpdate,
  schemaProviderDefaultScheduleUpdate,
  schemaProviderRestoreDefaultSchedule,
  schemaAvailableSlotsQuery,
};
