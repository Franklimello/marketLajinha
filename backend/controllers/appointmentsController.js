const appointmentsService = require('../services/appointmentsService');
const userAccountsService = require('../services/userAccountsService');

async function criar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const appointment = await appointmentsService.createAppointment(req.firebaseDecoded, req.validated);
    res.status(201).json(appointment);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function minhas(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const appointments = await appointmentsService.listClientAppointments(req.firebaseDecoded);
    res.json(appointments);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorListar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const appointments = await appointmentsService.listProviderAppointments(providerAccount, req.query.status);
    res.json(appointments);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorAcao(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const appointment = await appointmentsService.providerAction(providerAccount, req.params.id, req.validated);
    res.json(appointment);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function clienteResposta(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const appointment = await appointmentsService.clientResponse(req.firebaseDecoded, req.params.id, req.validated);
    res.json(appointment);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorAgenda(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const appointments = await appointmentsService.listProviderSchedule(
      providerAccount,
      req.query.date_from,
      req.query.date_to
    );
    res.json(appointments);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

module.exports = {
  criar,
  minhas,
  prestadorListar,
  prestadorAcao,
  clienteResposta,
  prestadorAgenda,
};
