const rankingService = require('../services/rankingService');
const clientesService = require('../services/clientesService');

function calcularDiasRestantesMes() {
  const agora = new Date();
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
  const diff = fimMes.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function obterMensalPorCidade(req, res, next) {
  try {
    const cidadeId = String(req.query.cidade_id || '').trim();
    if (!cidadeId) return res.status(400).json({ erro: 'cidade_id é obrigatório.' });

    let currentUserId = '';
    if (req.firebaseDecoded?.uid) {
      const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
      if (cliente?.id) currentUserId = cliente.id;
    }

    const ranking = await rankingService.obterRankingMensalCidade(cidadeId, currentUserId);
    res.json({
      ...ranking,
      diasRestantes: calcularDiasRestantesMes(),
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  obterMensalPorCidade,
};
