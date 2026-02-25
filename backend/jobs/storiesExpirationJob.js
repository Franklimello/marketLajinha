const cron = require('node-cron');
const { expirarStories } = require('../services/storiesService');

const STORIES_EXPIRATION_CRON = '*/10 * * * *';
const STORIES_EXPIRATION_TIMEZONE = process.env.STORIES_EXPIRATION_TIMEZONE || 'America/Sao_Paulo';

function startStoriesExpirationJob() {
  const task = cron.schedule(
    STORIES_EXPIRATION_CRON,
    async () => {
      try {
        const qtd = await expirarStories();
        if (qtd > 0) {
          console.log(`[STORIES] ${qtd} story(s) expirado(s) e desativado(s).`);
        }
      } catch (err) {
        console.error(`[STORIES] Erro ao expirar stories: ${err.message}`);
      }
    },
    { timezone: STORIES_EXPIRATION_TIMEZONE }
  );

  console.log(`[STORIES] Job de expiração agendado (${STORIES_EXPIRATION_CRON}) timezone=${STORIES_EXPIRATION_TIMEZONE}`);
  return task;
}

module.exports = { startStoriesExpirationJob };
