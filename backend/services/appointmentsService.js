const { prisma } = require('../config/database');
const {
  notificarClienteAgendamento,
  notificarPrestadorAgendamento,
} = require('./notificacaoService');

const STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COUNTER_OFFER: 'counter_offer',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const BLOCKING_STATUSES = [
  STATUS.PENDING,
  STATUS.ACCEPTED,
  STATUS.COUNTER_OFFER,
  STATUS.CONFIRMED,
];

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const SLOT_START_HOUR = 6;
const SLOT_END_HOUR = 22;
const SLOT_STEP_MINUTES = 30;

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(cleanText(value));
}

function parseDateOnly(value) {
  const raw = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const err = new Error('Data inválida. Use o formato YYYY-MM-DD.');
    err.status = 400;
    throw err;
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) {
    const err = new Error('Data inválida.');
    err.status = 400;
    throw err;
  }
  return parsed;
}

function formatDateToKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function timeToMinutes(time) {
  const [h, m] = cleanText(time).split(':').map(Number);
  return h * 60 + m;
}

function getSaoPauloNowParts() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const byType = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const dateKey = `${byType.year}-${byType.month}-${byType.day}`;
  const timeKey = `${byType.hour}:${byType.minute}`;

  return { dateKey, timeKey };
}

function getTimeZoneOffsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const asUtc = Date.UTC(
    Number(byType.year || 0),
    Number(byType.month || 1) - 1,
    Number(byType.day || 1),
    Number(byType.hour || 0),
    Number(byType.minute || 0),
    Number(byType.second || 0)
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

function createDateTimeInTimeZone(dateKey, time, timeZone) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  const [hour, minute] = cleanText(time).split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, utcGuess);
  return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
}

function isPastDateTime(date, time) {
  const targetDateKey = formatDateToKey(date);
  const targetTime = cleanText(time);
  if (!isValidTime(targetTime)) return false;

  const now = getSaoPauloNowParts();
  if (targetDateKey < now.dateKey) return true;
  if (targetDateKey > now.dateKey) return false;
  return targetTime <= now.timeKey;
}

function minutesToTime(minutes) {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Number(minutes || 0)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hasOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function buildDefaultSlots(startHour = SLOT_START_HOUR, endHour = SLOT_END_HOUR, stepMinutes = SLOT_STEP_MINUTES) {
  const slots = [];
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

function getEffectiveTime(appointment) {
  if (
    appointment?.status === STATUS.COUNTER_OFFER
    && cleanText(appointment?.counter_proposed_time)
    && isValidTime(appointment.counter_proposed_time)
  ) {
    return appointment.counter_proposed_time;
  }
  return appointment?.time || '00:00';
}

function resolveClientCity(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : [];
  const padrao = enderecos.find((item) => item?.padrao) || enderecos[0];
  return cleanText(padrao?.cidade);
}

function mapAppointment(appointment) {
  const effectiveTime = getEffectiveTime(appointment);
  const duration = Number(appointment?.service?.duration_minutes || 0);
  const endTime = minutesToTime(timeToMinutes(effectiveTime) + duration);
  const counter = cleanText(appointment?.counter_proposed_time);

  return {
    id: appointment.id,
    service_id: appointment.service_id,
    client_id: appointment.client_id,
    provider_id: appointment.provider_id,
    date: formatDateToKey(appointment.date),
    time: appointment.time,
    status: appointment.status,
    counter_proposed_time: counter,
    created_at: appointment.created_at,
    effective_time: effectiveTime,
    end_time: endTime,
    service: appointment.service
      ? {
        id: appointment.service.id,
        name: appointment.service.name,
        description: appointment.service.description,
        price: Number(appointment.service.price || 0),
        duration_minutes: Number(appointment.service.duration_minutes || 0),
        city: appointment.service.city,
      }
      : null,
    client: appointment.client
      ? {
        id: appointment.client.id,
        nome: appointment.client.nome,
        email: appointment.client.email,
        telefone: appointment.client.telefone,
      }
      : null,
    provider: appointment.provider
      ? {
        id: appointment.provider.id,
        name: appointment.provider.name,
        city: appointment.provider.city,
      }
      : null,
    client_notice:
      appointment.status === STATUS.COUNTER_OFFER && counter
        ? `The provider suggested a new time: ${counter}`
        : '',
  };
}

function mapBlockedSlot(slot) {
  return {
    id: slot.id,
    provider_id: slot.provider_id,
    date: formatDateToKey(slot.date),
    time: slot.time,
    created_at: slot.created_at,
  };
}

function getAppointmentStartDateTime(appointment) {
  const dateKey = formatDateToKey(appointment?.date);
  const time = getEffectiveTime(appointment);
  const start = createDateTimeInTimeZone(dateKey, time, SAO_PAULO_TIME_ZONE);
  if (!Number.isFinite(start.getTime())) return null;
  return start;
}

function canCancelStatus(status) {
  return [STATUS.PENDING, STATUS.ACCEPTED, STATUS.COUNTER_OFFER, STATUS.CONFIRMED].includes(status);
}

function canCompleteStatus(status) {
  return [STATUS.ACCEPTED, STATUS.CONFIRMED].includes(status);
}

function safePush(promise) {
  return Promise.resolve(promise).catch((err) => {
    console.warn('[Appointments][Push] Falha ao enviar notificação:', err?.message || err);
  });
}

async function ensureClientFromFirebase(firebaseUid) {
  const cliente = await prisma.clientes.findUnique({
    where: { firebase_uid: firebaseUid },
    include: {
      enderecos: {
        select: { id: true, cidade: true, padrao: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!cliente) {
    const err = new Error('Cliente não encontrado. Faça o cadastro primeiro.');
    err.status = 404;
    throw err;
  }

  return cliente;
}

async function loadBlockingWindows({ providerId, date, excludeAppointmentId = null }) {
  const [appointments, blockedSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        provider_id: providerId,
        date,
        status: { in: BLOCKING_STATUSES },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: {
        service: {
          select: { duration_minutes: true },
        },
      },
    }),
    prisma.providerBlockedSlot.findMany({
      where: {
        provider_id: providerId,
        date,
      },
      select: {
        id: true,
        provider_id: true,
        date: true,
        time: true,
        created_at: true,
      },
    }),
  ]);

  const windows = [];

  for (const item of appointments) {
    const start = timeToMinutes(getEffectiveTime(item));
    const end = start + Number(item?.service?.duration_minutes || 0);
    windows.push({
      start,
      end,
      type: 'appointment',
      appointment_id: item.id,
    });
  }

  for (const slot of blockedSlots) {
    const start = timeToMinutes(slot.time);
    const end = start + SLOT_STEP_MINUTES;
    windows.push({
      start,
      end,
      type: 'manual_block',
      slot_id: slot.id,
      time: slot.time,
    });
  }

  return { windows, appointments, blockedSlots };
}

async function assertProviderAvailability({
  providerId,
  date,
  time,
  durationMinutes,
  excludeAppointmentId = null,
}) {
  const { windows } = await loadBlockingWindows({
    providerId,
    date,
    excludeAppointmentId,
  });

  const targetStart = timeToMinutes(time);
  const targetEnd = targetStart + Number(durationMinutes || 0);

  for (const window of windows) {
    if (hasOverlap(targetStart, targetEnd, window.start, window.end)) {
      const err = new Error('Horário indisponível. Escolha outro horário.');
      err.status = 409;
      throw err;
    }
  }
}

async function createAppointment(firebaseDecoded, payload) {
  const service = await prisma.service.findUnique({
    where: { id: payload.service_id },
    include: {
      provider: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  if (!service) {
    const err = new Error('Serviço não encontrado.');
    err.status = 404;
    throw err;
  }

  const cliente = await ensureClientFromFirebase(firebaseDecoded.uid);
  const clientCity = resolveClientCity(cliente);

  if (!clientCity) {
    const err = new Error('Defina um endereço com cidade para solicitar agendamentos.');
    err.status = 400;
    throw err;
  }

  if (normalizeText(clientCity) !== normalizeText(service.city)) {
    const err = new Error('Este serviço não está disponível para sua cidade.');
    err.status = 403;
    throw err;
  }

  const bookingDate = parseDateOnly(payload.date);
  if (!isValidTime(payload.time)) {
    const err = new Error('Hora inválida. Use o formato HH:mm.');
    err.status = 400;
    throw err;
  }
  if (isPastDateTime(bookingDate, payload.time)) {
    const err = new Error('Não é possível agendar em data/horário passado.');
    err.status = 400;
    throw err;
  }

  await assertProviderAvailability({
    providerId: service.provider_id,
    date: bookingDate,
    time: payload.time,
    durationMinutes: service.duration_minutes,
  });

  const created = await prisma.appointment.create({
    data: {
      service_id: service.id,
      client_id: cliente.id,
      provider_id: service.provider_id,
      date: bookingDate,
      time: payload.time,
      status: STATUS.PENDING,
      counter_proposed_time: '',
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarPrestadorAgendamento(created.provider_id, {
    title: 'Novo agendamento solicitado',
    body: `${created.client?.nome || 'Cliente'} solicitou ${created.service?.name || 'um serviço'} em ${formatDateToKey(created.date)} às ${created.time}.`,
    appointmentId: created.id,
  }));

  return mapAppointment(created);
}

async function listClientAppointments(firebaseDecoded) {
  const cliente = await ensureClientFromFirebase(firebaseDecoded.uid);

  const appointments = await prisma.appointment.findMany({
    where: { client_id: cliente.id },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
    orderBy: [
      { date: 'desc' },
      { created_at: 'desc' },
    ],
  });

  return appointments.map(mapAppointment);
}

async function listProviderAppointments(providerAccount, statusFilter = '') {
  const where = {
    provider_id: providerAccount.id,
  };

  const status = cleanText(statusFilter).toLowerCase();
  if (status) where.status = status;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
    orderBy: [
      { date: 'asc' },
      { created_at: 'asc' },
    ],
  });

  return appointments.map(mapAppointment);
}

async function providerAction(providerAccount, appointmentId, payload) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Agendamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (appointment.provider_id !== providerAccount.id) {
    const err = new Error('Você não pode gerenciar este agendamento.');
    err.status = 403;
    throw err;
  }

  const action = cleanText(payload.action).toLowerCase();
  if (!['accept', 'reject', 'counter_offer'].includes(action)) {
    const err = new Error('Ação inválida para o prestador.');
    err.status = 400;
    throw err;
  }

  if (action === 'accept') {
    await assertProviderAvailability({
      providerId: appointment.provider_id,
      date: appointment.date,
      time: appointment.time,
      durationMinutes: appointment.service.duration_minutes,
      excludeAppointmentId: appointment.id,
    });

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: STATUS.ACCEPTED,
        counter_proposed_time: '',
      },
      include: {
        service: true,
        client: { select: { id: true, nome: true, email: true, telefone: true } },
        provider: { select: { id: true, name: true, city: true } },
      },
    });
    await safePush(notificarClienteAgendamento(updated.client_id, {
      title: 'Agendamento aceito',
      body: `${updated.provider?.name || 'Prestador'} aceitou seu agendamento de ${formatDateToKey(updated.date)} às ${updated.time}.`,
      appointmentId: updated.id,
      url: '/meus-agendamentos',
    }));
    return mapAppointment(updated);
  }

  if (action === 'reject') {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: STATUS.REJECTED,
        counter_proposed_time: '',
      },
      include: {
        service: true,
        client: { select: { id: true, nome: true, email: true, telefone: true } },
        provider: { select: { id: true, name: true, city: true } },
      },
    });
    await safePush(notificarClienteAgendamento(updated.client_id, {
      title: 'Agendamento recusado',
      body: `${updated.provider?.name || 'Prestador'} recusou sua solicitação de agendamento.`,
      appointmentId: updated.id,
      url: '/meus-agendamentos',
    }));
    return mapAppointment(updated);
  }

  const newTime = cleanText(payload.new_time);
  if (!isValidTime(newTime)) {
    const err = new Error('Novo horário inválido. Use HH:mm.');
    err.status = 400;
    throw err;
  }

  await assertProviderAvailability({
    providerId: appointment.provider_id,
    date: appointment.date,
    time: newTime,
    durationMinutes: appointment.service.duration_minutes,
    excludeAppointmentId: appointment.id,
  });

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: STATUS.COUNTER_OFFER,
      counter_proposed_time: newTime,
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarClienteAgendamento(updated.client_id, {
    title: 'Nova contraproposta de horário',
    body: `${updated.provider?.name || 'Prestador'} sugeriu ${updated.counter_proposed_time}.`,
    appointmentId: updated.id,
    url: '/meus-agendamentos',
  }));

  return mapAppointment(updated);
}

async function clientResponse(firebaseDecoded, appointmentId, payload) {
  const cliente = await ensureClientFromFirebase(firebaseDecoded.uid);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Agendamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (appointment.client_id !== cliente.id) {
    const err = new Error('Você não pode responder este agendamento.');
    err.status = 403;
    throw err;
  }

  const action = cleanText(payload.action).toLowerCase();
  if (!['accept', 'reject'].includes(action)) {
    const err = new Error('Ação inválida para o cliente.');
    err.status = 400;
    throw err;
  }

  if (appointment.status !== STATUS.COUNTER_OFFER) {
    const err = new Error('Este agendamento não possui contraproposta pendente.');
    err.status = 400;
    throw err;
  }

  if (action === 'reject') {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: STATUS.REJECTED,
        counter_proposed_time: '',
      },
      include: {
        service: true,
        client: { select: { id: true, nome: true, email: true, telefone: true } },
        provider: { select: { id: true, name: true, city: true } },
      },
    });
    await safePush(notificarPrestadorAgendamento(updated.provider_id, {
      title: 'Contraproposta recusada',
      body: `${updated.client?.nome || 'Cliente'} recusou a contraproposta de horário.`,
      appointmentId: updated.id,
    }));
    return mapAppointment(updated);
  }

  const counterTime = cleanText(appointment.counter_proposed_time);
  if (!isValidTime(counterTime)) {
    const err = new Error('Contraproposta inválida para confirmação.');
    err.status = 400;
    throw err;
  }

  await assertProviderAvailability({
    providerId: appointment.provider_id,
    date: appointment.date,
    time: counterTime,
    durationMinutes: appointment.service.duration_minutes,
    excludeAppointmentId: appointment.id,
  });

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: STATUS.CONFIRMED,
      time: counterTime,
      counter_proposed_time: '',
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarPrestadorAgendamento(updated.provider_id, {
    title: 'Agendamento confirmado pelo cliente',
    body: `${updated.client?.nome || 'Cliente'} confirmou o horário ${updated.time} em ${formatDateToKey(updated.date)}.`,
    appointmentId: updated.id,
  }));

  return mapAppointment(updated);
}

async function clientCancel(firebaseDecoded, appointmentId, payload = {}) {
  const cliente = await ensureClientFromFirebase(firebaseDecoded.uid);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Agendamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (appointment.client_id !== cliente.id) {
    const err = new Error('Você não pode cancelar este agendamento.');
    err.status = 403;
    throw err;
  }

  if (!canCancelStatus(appointment.status)) {
    const err = new Error('Este agendamento não pode mais ser cancelado.');
    err.status = 400;
    throw err;
  }

  const reason = cleanText(payload.reason);
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: STATUS.CANCELLED,
      counter_proposed_time: '',
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarPrestadorAgendamento(updated.provider_id, {
    title: 'Agendamento cancelado pelo cliente',
    body: `${updated.client?.nome || 'Cliente'} cancelou ${updated.service?.name || 'o agendamento'}${reason ? ` (${reason})` : ''}.`,
    appointmentId: updated.id,
  }));

  return mapAppointment(updated);
}

async function providerCancel(providerAccount, appointmentId, payload = {}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Agendamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (appointment.provider_id !== providerAccount.id) {
    const err = new Error('Você não pode cancelar este agendamento.');
    err.status = 403;
    throw err;
  }

  if (!canCancelStatus(appointment.status)) {
    const err = new Error('Este agendamento não pode mais ser cancelado.');
    err.status = 400;
    throw err;
  }

  const reason = cleanText(payload.reason);
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: STATUS.CANCELLED,
      counter_proposed_time: '',
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarClienteAgendamento(updated.client_id, {
    title: 'Agendamento cancelado pelo prestador',
    body: `${updated.provider?.name || 'Prestador'} cancelou ${updated.service?.name || 'seu agendamento'}${reason ? ` (${reason})` : ''}.`,
    appointmentId: updated.id,
    url: '/meus-agendamentos',
  }));

  return mapAppointment(updated);
}

async function providerComplete(providerAccount, appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  if (!appointment) {
    const err = new Error('Agendamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (appointment.provider_id !== providerAccount.id) {
    const err = new Error('Você não pode concluir este agendamento.');
    err.status = 403;
    throw err;
  }

  if (!canCompleteStatus(appointment.status)) {
    const err = new Error('Somente agendamentos aceitos/confirmados podem ser concluídos.');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: STATUS.COMPLETED,
      counter_proposed_time: '',
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  await safePush(notificarClienteAgendamento(updated.client_id, {
    title: 'Atendimento concluído',
    body: `${updated.provider?.name || 'Prestador'} concluiu ${updated.service?.name || 'seu agendamento'}.`,
    appointmentId: updated.id,
    url: '/meus-agendamentos',
  }));

  return mapAppointment(updated);
}

async function listProviderClients(providerAccount) {
  const appointments = await prisma.appointment.findMany({
    where: { provider_id: providerAccount.id },
    include: {
      service: {
        select: { id: true, name: true, duration_minutes: true, price: true },
      },
      client: {
        select: { id: true, nome: true, email: true, telefone: true },
      },
    },
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
  });

  const map = new Map();
  for (const item of appointments) {
    if (!item.client_id || !item.client) continue;
    const key = item.client_id;
    const current = map.get(key) || {
      client_id: item.client.id,
      nome: item.client.nome || '',
      email: item.client.email || '',
      telefone: item.client.telefone || '',
      total_agendamentos: 0,
      concluidos: 0,
      cancelados: 0,
      recusados: 0,
      pendentes: 0,
      historico: [],
      ultimo_agendamento_em: null,
    };

    current.total_agendamentos += 1;
    if (item.status === STATUS.COMPLETED) current.concluidos += 1;
    if (item.status === STATUS.CANCELLED) current.cancelados += 1;
    if (item.status === STATUS.REJECTED) current.recusados += 1;
    if ([STATUS.PENDING, STATUS.ACCEPTED, STATUS.COUNTER_OFFER, STATUS.CONFIRMED].includes(item.status)) {
      current.pendentes += 1;
    }
    if (!current.ultimo_agendamento_em) current.ultimo_agendamento_em = formatDateToKey(item.date);

    current.historico.push({
      id: item.id,
      date: formatDateToKey(item.date),
      time: item.time,
      status: item.status,
      service: item.service
        ? {
          id: item.service.id,
          name: item.service.name,
          duration_minutes: Number(item.service.duration_minutes || 0),
          price: Number(item.service.price || 0),
        }
        : null,
    });
    map.set(key, current);
  }

  return Array.from(map.values());
}

async function listProviderSchedule(providerAccount, dateFromRaw, dateToRaw) {
  let from = dateFromRaw ? parseDateOnly(dateFromRaw) : null;
  let to = dateToRaw ? parseDateOnly(dateToRaw) : null;

  if (!from || !to) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    from = from || start;
    to = to || end;
  }

  if (from.getTime() > to.getTime()) {
    const err = new Error('Intervalo de datas inválido.');
    err.status = 400;
    throw err;
  }

  const [appointments, blockedSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        provider_id: providerAccount.id,
        date: {
          gte: from,
          lte: to,
        },
        status: {
          notIn: [STATUS.REJECTED, STATUS.CANCELLED],
        },
      },
      include: {
        service: true,
        client: { select: { id: true, nome: true, email: true, telefone: true } },
        provider: { select: { id: true, name: true, city: true } },
      },
      orderBy: [
        { date: 'asc' },
        { created_at: 'asc' },
      ],
    }),
    prisma.providerBlockedSlot.findMany({
      where: {
        provider_id: providerAccount.id,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
    }),
  ]);

  return {
    appointments: appointments.map(mapAppointment),
    blocked_slots: blockedSlots.map(mapBlockedSlot),
  };
}

async function setProviderSlotOccupancy(providerAccount, payload) {
  const date = parseDateOnly(payload.date);
  const time = cleanText(payload.time);
  const occupied = !!payload.occupied;

  if (!isValidTime(time)) {
    const err = new Error('Hora inválida. Use HH:mm.');
    err.status = 400;
    throw err;
  }

  const start = timeToMinutes(time);
  const end = start + SLOT_STEP_MINUTES;

  const appointments = await prisma.appointment.findMany({
    where: {
      provider_id: providerAccount.id,
      date,
      status: { in: BLOCKING_STATUSES },
    },
    include: {
      service: {
        select: { duration_minutes: true },
      },
    },
  });

  const bookedByAppointment = appointments.some((item) => {
    const appointmentStart = timeToMinutes(getEffectiveTime(item));
    const appointmentEnd = appointmentStart + Number(item?.service?.duration_minutes || 0);
    return hasOverlap(start, end, appointmentStart, appointmentEnd);
  });

  if (bookedByAppointment && !occupied) {
    const err = new Error('Este horário está ocupado por um agendamento e não pode ser liberado.');
    err.status = 409;
    throw err;
  }

  if (bookedByAppointment && occupied) {
    return {
      date: formatDateToKey(date),
      time,
      occupied: true,
      source: 'appointment',
    };
  }

  const existing = await prisma.providerBlockedSlot.findFirst({
    where: {
      provider_id: providerAccount.id,
      date,
      time,
    },
  });

  if (occupied && !existing) {
    await prisma.providerBlockedSlot.create({
      data: {
        provider_id: providerAccount.id,
        date,
        time,
      },
    });
  }

  if (!occupied && existing) {
    await prisma.providerBlockedSlot.delete({
      where: { id: existing.id },
    });
  }

  return {
    date: formatDateToKey(date),
    time,
    occupied,
    source: occupied ? 'manual_block' : 'free',
  };
}

async function setProviderDayOccupancy(providerAccount, payload) {
  const date = parseDateOnly(payload.date);
  const occupied = !!payload.occupied;
  const dayKey = formatDateToKey(date);

  const appointments = await prisma.appointment.findMany({
    where: {
      provider_id: providerAccount.id,
      date,
      status: { in: BLOCKING_STATUSES },
    },
    include: {
      service: {
        select: { duration_minutes: true },
      },
    },
  });

  const appointmentBlockedSet = new Set();
  for (const item of appointments) {
    const start = timeToMinutes(getEffectiveTime(item));
    const end = start + Number(item?.service?.duration_minutes || 0);
    for (let cursor = start; cursor < end; cursor += SLOT_STEP_MINUTES) {
      appointmentBlockedSet.add(minutesToTime(cursor));
    }
  }

  const allSlots = buildDefaultSlots();
  const targetSlots = allSlots.filter((slot) => !appointmentBlockedSet.has(slot));

  if (targetSlots.length > 0) {
    if (occupied) {
      await prisma.$transaction(
        targetSlots.map((time) => prisma.providerBlockedSlot.upsert({
          where: {
            provider_id_date_time: {
              provider_id: providerAccount.id,
              date,
              time,
            },
          },
          create: {
            provider_id: providerAccount.id,
            date,
            time,
          },
          update: {},
        }))
      );
    } else {
      await prisma.providerBlockedSlot.deleteMany({
        where: {
          provider_id: providerAccount.id,
          date,
          time: { in: targetSlots },
        },
      });
    }
  }

  const blockedSlots = await prisma.providerBlockedSlot.findMany({
    where: {
      provider_id: providerAccount.id,
      date,
    },
    orderBy: { time: 'asc' },
    select: {
      id: true,
      provider_id: true,
      date: true,
      time: true,
      created_at: true,
    },
  });

  return {
    date: dayKey,
    occupied,
    updated_slots: targetSlots.length,
    appointment_locked_slots: appointmentBlockedSet.size,
    blocked_slots_current_day: blockedSlots.map(mapBlockedSlot),
  };
}

async function setProviderDefaultSchedule(providerAccount, payload) {
  const startTime = cleanText(payload.start_time);
  const endTime = cleanText(payload.end_time);
  const exceptSunday = payload.except_sunday !== false;
  const workdaysMode = ['SEG_SEX', 'SEG_SAB', 'TODOS'].includes(payload.workdays_mode)
    ? payload.workdays_mode
    : (exceptSunday ? 'SEG_SAB' : 'TODOS');

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    const err = new Error('Faixa de horário inválida. Use HH:mm.');
    err.status = 400;
    throw err;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes >= endMinutes) {
    const err = new Error('O horário final deve ser maior que o inicial.');
    err.status = 400;
    throw err;
  }

  const from = payload.date_from ? parseDateOnly(payload.date_from) : parseDateOnly(formatDateToKey(new Date()));
  const to = payload.date_to
    ? parseDateOnly(payload.date_to)
    : parseDateOnly(formatDateToKey(new Date(Date.now() + (1000 * 60 * 60 * 24 * 60))));

  if (from.getTime() > to.getTime()) {
    const err = new Error('Intervalo de datas inválido.');
    err.status = 400;
    throw err;
  }

  const allSlots = buildDefaultSlots();
  let cursor = new Date(from);
  let daysUpdated = 0;
  let blockedUpserted = 0;
  let unblockedRemoved = 0;

  while (cursor.getTime() <= to.getTime()) {
    const date = parseDateOnly(formatDateToKey(cursor));
    const weekDay = cursor.getUTCDay();
    const isWorkingDay = workdaysMode === 'TODOS'
      ? true
      : (workdaysMode === 'SEG_SEX' ? weekDay >= 1 && weekDay <= 5 : weekDay >= 1 && weekDay <= 6);

    const appointments = await prisma.appointment.findMany({
      where: {
        provider_id: providerAccount.id,
        date,
        status: { in: BLOCKING_STATUSES },
      },
      include: {
        service: {
          select: { duration_minutes: true },
        },
      },
    });

    const appointmentBlockedSet = new Set();
    for (const item of appointments) {
      const start = timeToMinutes(getEffectiveTime(item));
      const end = start + Number(item?.service?.duration_minutes || 0);
      for (let step = start; step < end; step += SLOT_STEP_MINUTES) {
        appointmentBlockedSet.add(minutesToTime(step));
      }
    }

    const shouldBeFreeSet = new Set(
      !isWorkingDay
        ? []
        : allSlots.filter((slot) => {
          const minutes = timeToMinutes(slot);
          return minutes >= startMinutes && minutes < endMinutes;
        })
    );

    const toBlock = allSlots.filter((slot) => (
      !shouldBeFreeSet.has(slot) && !appointmentBlockedSet.has(slot)
    ));

    const toUnblock = allSlots.filter((slot) => (
      shouldBeFreeSet.has(slot) && !appointmentBlockedSet.has(slot)
    ));

    if (toBlock.length > 0) {
      // createMany com skipDuplicates evita centenas de upserts por dia,
      // reduz risco de timeout/erro de transacao em periodos maiores.
      const created = await prisma.providerBlockedSlot.createMany({
        data: toBlock.map((time) => ({
          provider_id: providerAccount.id,
          date,
          time,
        })),
        skipDuplicates: true,
      });
      blockedUpserted += Number(created?.count || 0);
    }

    if (toUnblock.length > 0) {
      const removed = await prisma.providerBlockedSlot.deleteMany({
        where: {
          provider_id: providerAccount.id,
          date,
          time: { in: toUnblock },
        },
      });
      unblockedRemoved += Number(removed?.count || 0);
    }

    daysUpdated += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    date_from: formatDateToKey(from),
    date_to: formatDateToKey(to),
    start_time: startTime,
    end_time: endTime,
    except_sunday: exceptSunday,
    workdays_mode: workdaysMode,
    days_updated: daysUpdated,
    blocked_upserted: blockedUpserted,
    unblocked_removed: unblockedRemoved,
  };
}

async function restoreProviderDefaultSchedule(providerAccount, payload) {
  const from = parseDateOnly(payload.date_from);
  const to = parseDateOnly(payload.date_to);

  if (from.getTime() > to.getTime()) {
    const err = new Error('Intervalo de datas inválido.');
    err.status = 400;
    throw err;
  }

  const inRange = (dateKey) => dateKey >= formatDateToKey(from) && dateKey <= formatDateToKey(to);
  const uniqueSnapshot = new Map();
  for (const slot of Array.isArray(payload.blocked_slots) ? payload.blocked_slots : []) {
    const dateKey = cleanText(slot?.date);
    const time = cleanText(slot?.time);
    if (!dateKey || !time || !isValidTime(time) || !inRange(dateKey)) continue;
    uniqueSnapshot.set(`${dateKey}__${time}`, { date: parseDateOnly(dateKey), time });
  }

  await prisma.providerBlockedSlot.deleteMany({
    where: {
      provider_id: providerAccount.id,
      date: {
        gte: from,
        lte: to,
      },
    },
  });

  const data = Array.from(uniqueSnapshot.values()).map((slot) => ({
    provider_id: providerAccount.id,
    date: slot.date,
    time: slot.time,
  }));

  let restoredCount = 0;
  if (data.length > 0) {
    const created = await prisma.providerBlockedSlot.createMany({
      data,
      skipDuplicates: true,
    });
    restoredCount = Number(created?.count || 0);
  }

  return {
    date_from: formatDateToKey(from),
    date_to: formatDateToKey(to),
    restored_count: restoredCount,
  };
}

async function listAvailableSlotsForService(payload) {
  const service = await prisma.service.findUnique({
    where: { id: payload.service_id },
    include: {
      provider: {
        select: { id: true, name: true, city: true },
      },
    },
  });

  if (!service) {
    const err = new Error('Serviço não encontrado.');
    err.status = 404;
    throw err;
  }

  const date = parseDateOnly(payload.date);
  const duration = Number(service.duration_minutes || 0);
  const slots = buildDefaultSlots();

  const { windows } = await loadBlockingWindows({
    providerId: service.provider_id,
    date,
  });

  const mappedSlots = slots.map((slotTime) => {
    const start = timeToMinutes(slotTime);
    const end = start + duration;
    const occupied = windows.some((window) => hasOverlap(start, end, window.start, window.end));
    const past = isPastDateTime(date, slotTime);

    return {
      time: slotTime,
      available: !occupied && !past,
    };
  });

  return {
    service_id: service.id,
    provider_id: service.provider_id,
    city: service.city,
    date: formatDateToKey(date),
    duration_minutes: duration,
    slots: mappedSlots,
    free_slots: mappedSlots.filter((slot) => slot.available).map((slot) => slot.time),
  };
}

async function sendDueAppointmentReminders() {
  const now = new Date();
  const next24h = new Date(now.getTime() + (24 * 60 * 60 * 1000));

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: [STATUS.ACCEPTED, STATUS.CONFIRMED] },
      date: { lte: next24h },
      OR: [
        { reminder_24h_sent_at: null },
        { reminder_2h_sent_at: null },
      ],
    },
    include: {
      service: true,
      client: { select: { id: true, nome: true, email: true, telefone: true } },
      provider: { select: { id: true, name: true, city: true } },
    },
  });

  for (const appointment of appointments) {
    const startsAt = getAppointmentStartDateTime(appointment);
    if (!startsAt) continue;
    const diffMs = startsAt.getTime() - now.getTime();
    if (diffMs <= 0) continue;

    const should24h =
      !appointment.reminder_24h_sent_at
      && diffMs <= 24 * 60 * 60 * 1000
      && diffMs > 23 * 60 * 60 * 1000;

    const should2h =
      !appointment.reminder_2h_sent_at
      && diffMs <= 2 * 60 * 60 * 1000
      && diffMs > 90 * 60 * 1000;

    if (!should24h && !should2h) continue;

    const dateText = formatDateToKey(appointment.date);
    const timeText = getEffectiveTime(appointment);
    const serviceName = appointment.service?.name || 'serviço';
    const providerName = appointment.provider?.name || 'Prestador';
    const clientName = appointment.client?.nome || 'Cliente';

    if (should24h) {
      await safePush(notificarClienteAgendamento(appointment.client_id, {
        title: 'Lembrete: seu atendimento é amanhã',
        body: `${serviceName} com ${providerName} em ${dateText} às ${timeText}.`,
        appointmentId: appointment.id,
        url: '/meus-agendamentos',
      }));
      await safePush(notificarPrestadorAgendamento(appointment.provider_id, {
        title: 'Lembrete de atendimento (24h)',
        body: `${clientName} • ${serviceName} em ${dateText} às ${timeText}.`,
        appointmentId: appointment.id,
      }));
    }

    if (should2h) {
      await safePush(notificarClienteAgendamento(appointment.client_id, {
        title: 'Lembrete: faltam 2 horas',
        body: `${serviceName} com ${providerName} às ${timeText}.`,
        appointmentId: appointment.id,
        url: '/meus-agendamentos',
      }));
      await safePush(notificarPrestadorAgendamento(appointment.provider_id, {
        title: 'Lembrete de atendimento (2h)',
        body: `${clientName} • ${serviceName} às ${timeText}.`,
        appointmentId: appointment.id,
      }));
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        ...(should24h ? { reminder_24h_sent_at: new Date() } : {}),
        ...(should2h ? { reminder_2h_sent_at: new Date() } : {}),
      },
    });
  }
}

module.exports = {
  STATUS,
  createAppointment,
  listClientAppointments,
  listProviderAppointments,
  providerAction,
  clientResponse,
  clientCancel,
  providerCancel,
  providerComplete,
  listProviderClients,
  listProviderSchedule,
  setProviderSlotOccupancy,
  setProviderDayOccupancy,
  setProviderDefaultSchedule,
  restoreProviderDefaultSchedule,
  listAvailableSlotsForService,
  sendDueAppointmentReminders,
};
