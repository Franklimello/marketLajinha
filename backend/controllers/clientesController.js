const clientesService = require('../services/clientesService');
const notificacaoService = require('../services/notificacaoService');

async function meuPerfil(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });

    let cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado. Faça o cadastro.' });
    }
    res.json(cliente);
  } catch (e) { next(e) }
}

async function cadastrar(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });

    const existente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (existente) return res.json(existente);

    const { nome, telefone } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    const cliente = await clientesService.criar({
      firebase_uid: req.firebaseDecoded.uid,
      nome,
      email: req.firebaseDecoded.email || '',
      telefone: telefone || '',
    });
    res.status(201).json(cliente);
  } catch (e) { next(e) }
}

async function atualizarPerfil(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });

    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const { nome, telefone } = req.body;
    const atualizado = await clientesService.atualizar(cliente.id, {
      ...(nome && { nome }),
      ...(telefone !== undefined && { telefone }),
    });
    res.json(atualizado);
  } catch (e) { next(e) }
}

// ---- Endereços ----

async function listarEnderecos(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const enderecos = await clientesService.listarEnderecos(cliente.id);
    res.json(enderecos);
  } catch (e) { next(e) }
}

async function criarEndereco(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const { apelido, cidade, bairro, rua, numero, complemento, referencia, padrao } = req.body;
    if (!cidade || !bairro || !rua || !numero) {
      return res.status(400).json({ erro: 'Cidade, bairro, rua e número são obrigatórios.' });
    }

    const endereco = await clientesService.criarEndereco(cliente.id, {
      apelido: apelido || '', cidade, bairro, rua, numero,
      complemento: complemento || '', referencia: referencia || '',
      padrao: !!padrao,
    });
    res.status(201).json(endereco);
  } catch (e) { next(e) }
}

async function atualizarEndereco(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const { cidade, bairro, rua, numero } = req.body || {};
    if (!cidade || !bairro || !rua || !numero) {
      return res.status(400).json({ erro: 'Cidade, bairro, rua e número são obrigatórios.' });
    }

    const endereco = await clientesService.atualizarEndereco(cliente.id, req.params.id, req.body);
    res.json(endereco);
  } catch (e) { next(e) }
}

async function definirPadrao(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const endereco = await clientesService.definirPadrao(cliente.id, req.params.id);
    res.json(endereco);
  } catch (e) { next(e) }
}

async function excluirEndereco(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    await clientesService.excluirEndereco(req.params.id);
    res.status(204).send();
  } catch (e) { next(e) }
}

async function salvarFcmToken(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const { token } = req.body;
    if (!token) return res.status(400).json({ erro: 'Token FCM obrigatório.' });

    await notificacaoService.salvarToken(cliente.id, token);
    res.json({ ok: true });
  } catch (e) { next(e) }
}

async function removerFcmToken(req, res, next) {
  try {
    const { token } = req.body;
    if (token) await notificacaoService.removerToken(token);
    res.json({ ok: true });
  } catch (e) { next(e) }
}

module.exports = {
  meuPerfil, cadastrar, atualizarPerfil,
  listarEnderecos, criarEndereco, atualizarEndereco, definirPadrao, excluirEndereco,
  salvarFcmToken, removerFcmToken,
};
