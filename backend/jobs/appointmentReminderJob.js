const { sendDueAppointmentReminders } = require('../services/appointmentsService');

const REMINDER_INTERVAL_MS = 10 * 60 * 1000;
let started = false;

async function runReminderCycle() {
  try {
    await sendDueAppointmentReminders();
  } catch (err) {
    console.error('[AppointmentReminderJob] Falha ao processar lembretes:', err?.message || err);
  }
}

function startAppointmentReminderJob() {
  if (started) return;
  started = true;
  runReminderCycle();
  setInterval(runReminderCycle, REMINDER_INTERVAL_MS);
  console.log('[AppointmentReminderJob] Iniciado (intervalo 10min).');
}

module.exports = {
  startAppointmentReminderJob,
};

