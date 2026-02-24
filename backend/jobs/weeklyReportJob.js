const cron = require('node-cron');
const { generateWeeklyReports } = require('../services/weeklyReportService');

const WEEKLY_REPORT_CRON = '0 8 * * 1';
const WEEKLY_REPORT_TIMEZONE = process.env.WEEKLY_REPORT_TIMEZONE || 'America/Sao_Paulo';

function startWeeklyReportJob() {
  const task = cron.schedule(
    WEEKLY_REPORT_CRON,
    async () => {
      try {
        console.log('[WEEKLY_REPORT] Iniciando geração automática de relatórios...');
        const result = await generateWeeklyReports();
        console.log(
          `[WEEKLY_REPORT] Finalizado. Período ${result.periodo.label}. ` +
          `Enviados: ${result.enviados} | Erros: ${result.erros}`
        );
      } catch (err) {
        console.error(`[WEEKLY_REPORT] Erro ao executar job semanal: ${err.message}`);
      }
    },
    { timezone: WEEKLY_REPORT_TIMEZONE }
  );

  console.log(
    `[WEEKLY_REPORT] Job agendado (${WEEKLY_REPORT_CRON}) ` +
    `timezone=${WEEKLY_REPORT_TIMEZONE}`
  );

  return task;
}

module.exports = { startWeeklyReportJob };
