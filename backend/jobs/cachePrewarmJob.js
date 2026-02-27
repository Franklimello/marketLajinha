const { listarLojasMaisAtivas } = require('../config/redis');
const { preaquecerCacheLojaSlug } = require('../services/lojasService');
const { preaquecerCachesProduto } = require('../services/produtosService');

const PREWARM_INTERVAL_MS = 5 * 60 * 1000;
const PREWARM_TOP_STORES = 20;
const PREWARM_CONCURRENCY = 3;

async function executarComConcorrencia(itens, worker, limite = PREWARM_CONCURRENCY) {
  const fila = [...itens];
  const runners = Array.from({ length: Math.max(1, limite) }).map(async () => {
    while (fila.length > 0) {
      const item = fila.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function executarPrewarm() {
  const startedAt = Date.now();
  const topLojas = listarLojasMaisAtivas(PREWARM_TOP_STORES);
  if (topLojas.length === 0) {
    console.log('[PREWARM] Sem lojas ativas recentes para preaquecer.');
    return;
  }

  await executarComConcorrencia(topLojas, async (loja) => {
    try {
      if (loja.storeSlug) {
        await preaquecerCacheLojaSlug(loja.storeSlug);
      }
      if (loja.storeId) {
        await preaquecerCachesProduto(loja.storeId, 1);
      } else if (loja.storeSlug) {
        // fallback para cenários em que só o slug foi registrado no acesso
        await preaquecerCachesProduto(loja.storeSlug, 1);
      }
    } catch (err) {
      console.warn(
        `[PREWARM] Erro ao preaquecer loja=${loja.storeSlug || loja.storeId} erro=${err.message}`
      );
    }
  });

  const elapsedMs = Date.now() - startedAt;
  console.log(`[PREWARM] Concluído em ${elapsedMs}ms para ${topLojas.length} loja(s).`);
}

function startCachePrewarmJob() {
  console.log(`[PREWARM] Job agendado a cada ${PREWARM_INTERVAL_MS / 1000}s (top=${PREWARM_TOP_STORES}, concorrencia=${PREWARM_CONCURRENCY}).`);
  const timer = setInterval(() => {
    executarPrewarm().catch((err) => {
      console.warn(`[PREWARM] Falha no ciclo: ${err.message}`);
    });
  }, PREWARM_INTERVAL_MS);

  setTimeout(() => {
    executarPrewarm().catch((err) => {
      console.warn(`[PREWARM] Falha no prewarm inicial: ${err.message}`);
    });
  }, 30 * 1000);

  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

module.exports = { startCachePrewarmJob, executarPrewarm };
