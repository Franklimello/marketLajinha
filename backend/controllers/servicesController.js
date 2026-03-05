const servicesCatalogService = require('../services/servicesCatalogService');
const userAccountsService = require('../services/userAccountsService');

async function listarPrestadores(req, res, next) {
  try {
    const city = String(req.query.city || '').trim();
    if (!city) {
      return res.status(400).json({ erro: 'Informe a cidade para listar prestadores.' });
    }
    const providers = await servicesCatalogService.listProvidersByCity(city);
    res.json(providers);
  } catch (e) {
    next(e);
  }
}

async function perfilPrestador(req, res, next) {
  try {
    const city = String(req.query.city || '').trim();
    if (!city) {
      return res.status(400).json({ erro: 'Informe a cidade para visualizar o perfil.' });
    }

    const profile = await servicesCatalogService.getProviderProfile(req.params.providerId, city);
    if (!profile) return res.status(404).json({ erro: 'Prestador não encontrado para esta cidade.' });
    res.json(profile);
  } catch (e) {
    next(e);
  }
}

async function meusServicos(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const services = await servicesCatalogService.listMyServices(providerAccount.id);
    res.json(services);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function criarServico(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const created = await servicesCatalogService.createService(providerAccount, req.validated);
    res.status(201).json(created);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function atualizarServico(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const updated = await servicesCatalogService.updateService(providerAccount.id, req.params.id, req.validated);
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function excluirServico(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    await servicesCatalogService.deleteService(providerAccount.id, req.params.id);
    res.status(204).send();
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

module.exports = {
  listarPrestadores,
  perfilPrestador,
  meusServicos,
  criarServico,
  atualizarServico,
  excluirServico,
};
