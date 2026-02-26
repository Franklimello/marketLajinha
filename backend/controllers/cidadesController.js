const cidadesService = require('../services/cidadesService');

async function listar(req, res, next) {
  try {
    const uf = cidadesService.validarEstado(req.query.estado);
    if (!uf) {
      return res.status(400).json({ erro: 'Parâmetro "estado" inválido. Use MG ou ES.' });
    }

    const cidades = await cidadesService.listarPorEstado(uf);
    res.set('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
    res.json(cidades || []);
  } catch (e) {
    next(e);
  }
}

module.exports = { listar };
