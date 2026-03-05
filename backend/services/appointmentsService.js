const { prisma } = require('../config/database');

const STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COUNTER_OFFER: 'counter_offer',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const BLOCKING_STATUSES = [
  STATUS.PENDING,
  STATUS.ACCEPTED,
  STATUS.COUNTER_OFFER,
  STATUS.CONFIRMED,
];

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 20;
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

  return mapAppointment(updated);
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

    return {
      time: slotTime,
      available: !occupied,
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

module.exports = {
  STATUS,
  createAppointment,
  listClientAppointments,
  listProviderAppointments,
  providerAction,
  clientResponse,
  listProviderSchedule,
  setProviderSlotOccupancy,
  listAvailableSlotsForService,
};
