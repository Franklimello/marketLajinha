const appointmentsService = require('../services/appointmentsService');
const userAccountsService = require('../services/userAccountsService');
const { schemaAvailableSlotsQuery } = require('../schemas/appointmentsSchema');

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

async function clienteCancelar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const appointment = await appointmentsService.clientCancel(req.firebaseDecoded, req.params.id, req.validated);
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
    const schedule = await appointmentsService.listProviderSchedule(
      providerAccount,
      req.query.date_from,
      req.query.date_to
    );
    res.json(schedule);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorAtualizarSlot(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const updated = await appointmentsService.setProviderSlotOccupancy(providerAccount, req.validated);
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorAtualizarDia(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const updated = await appointmentsService.setProviderDayOccupancy(providerAccount, req.validated);
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorAplicarPadrao(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const updated = await appointmentsService.setProviderDefaultSchedule(providerAccount, req.validated);
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorRestaurarPadrao(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const updated = await appointmentsService.restoreProviderDefaultSchedule(providerAccount, req.validated);
    res.json(updated);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorCancelar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const appointment = await appointmentsService.providerCancel(providerAccount, req.params.id, req.validated);
    res.json(appointment);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorConcluir(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const appointment = await appointmentsService.providerComplete(providerAccount, req.params.id);
    res.json(appointment);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function prestadorClientes(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const providerAccount = await userAccountsService.requireServiceProvider(req.firebaseDecoded);
    const clients = await appointmentsService.listProviderClients(providerAccount);
    res.json(clients);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function horariosDisponiveis(req, res, next) {
  try {
    const parsed = schemaAvailableSlotsQuery.safeParse(req.query || {});
    if (!parsed.success) {
      const erros = parsed.error.issues || parsed.error.errors || [];
      const detalhes = erros.map((item) => item.message).join('; ');
      return res.status(400).json({ erro: 'Parâmetros inválidos.', detalhes });
    }

    const slots = await appointmentsService.listAvailableSlotsForService(parsed.data);
    res.json(slots);
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
  clienteCancelar,
  prestadorAgenda,
  prestadorAtualizarSlot,
  prestadorAtualizarDia,
  prestadorAplicarPadrao,
  prestadorRestaurarPadrao,
  prestadorCancelar,
  prestadorConcluir,
  prestadorClientes,
  horariosDisponiveis,
};
