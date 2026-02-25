const lojasService = require('../services/lojasService');
const { gerarPixQRCode } = require('../utils/pix');

async function listar(req, res, next) {
  try {
    const { categoria_negocio, cidade } = req.query;
    const lojas = await lojasService.listar({ categoria_negocio, cidade });
    res.json(lojasService.adicionarAbertaAgoraLista(lojas));
  } catch (e) {
    next(e);
  }
}

async function listarAtivas(req, res, next) {
  try {
    const lojas = await lojasService.listarAtivas();
    res.json(lojasService.adicionarAbertaAgoraLista(lojas));
  } catch (e) {
    next(e);
  }
}

async function home(req, res, next) {
  try {
    const lojas = await lojasService.listarAtivasHome();
    res.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.json(lojasService.adicionarAbertaAgoraLista(lojas));
  } catch (e) {
    next(e);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    res.json(lojasService.adicionarAbertaAgora(loja));
  } catch (e) {
    next(e);
  }
}

async function buscarMinhaLoja(req, res, next) {
  try {
    if (!req.user?.loja_id) {
      return res.status(404).json({ erro: 'Você ainda não possui uma loja. Cadastre uma para começar.' });
    }
    const loja = await lojasService.buscarPorUsuario(req.user.loja_id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    res.json(lojasService.adicionarAbertaAgora(loja));
  } catch (e) {
    next(e);
  }
}

async function buscarPorSlug(req, res, next) {
  try {
    const loja = await lojasService.buscarPorSlug(req.params.slug);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    res.json(lojasService.adicionarAbertaAgora(loja));
  } catch (e) {
    next(e);
  }
}

async function criar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório para criar uma loja.' });
    }
    if (req.user) {
      return res.status(403).json({ erro: 'Você já está vinculado a uma loja. Não é possível criar outra.' });
    }
    const loja = await lojasService.criar(req.validated, req.firebaseDecoded, req.body);
    res.status(201).json(lojasService.adicionarAbertaAgora(loja));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Slug já utilizado por outra loja.' });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (loja.id !== req.user.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });
    const atualizada = await lojasService.atualizar(req.params.id, req.validated);
    res.json(lojasService.adicionarAbertaAgora(atualizada));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Slug já utilizado.' });
    next(e);
  }
}

async function toggle(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (loja.id !== req.user.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });

    const { aberta } = req.body;
    const atualizada = await lojasService.toggleAberta(req.params.id, aberta);
    res.json(lojasService.adicionarAbertaAgora(atualizada));
  } catch (e) {
    next(e);
  }
}

async function voltarAutomatico(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (loja.id !== req.user.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });

    const atualizada = await lojasService.desativarForcamento(req.params.id);
    res.json(lojasService.adicionarAbertaAgora(atualizada));
  } catch (e) {
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (loja.id !== req.user.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });
    await lojasService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

async function atualizarCategoriasDesativadas(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (loja.id !== req.user.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });

    // Validação: body deve conter { categorias: string[] }
    const { categorias } = req.body;
    if (!Array.isArray(categorias)) {
      return res.status(400).json({ erro: 'O campo "categorias" deve ser um array.' });
    }
    const categoriasValidas = categorias
      .filter((c) => typeof c === 'string')
      .map((c) => c.trim())
      .filter(Boolean);

    const { prisma } = require('../config/database');
    const { invalidarCache } = require('../config/redis');
    await prisma.lojas.update({
      where: { id: loja.id },
      data: { categorias_desativadas: JSON.stringify(categoriasValidas) },
    });
    await invalidarCache(`produtos:loja:${loja.id}:*`);
    await invalidarCache(`produtos:loja:${loja.slug}:*`);

    res.json({ categorias_desativadas: categoriasValidas });
  } catch (e) {
    next(e);
  }
}

async function gerarPix(req, res, next) {
  try {
    const loja = await lojasService.buscarPorId(req.params.id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });

    if (!loja.pix_chave) {
      return res.status(400).json({ erro: 'Esta loja não configurou os dados PIX.' });
    }

    const valor = parseFloat(req.body.valor);
    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido.' });
    }

    const txid = req.body.pedido_id
      ? req.body.pedido_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25)
      : undefined;

    const result = await gerarPixQRCode({
      chave: loja.pix_chave,
      nome: loja.pix_nome_titular || loja.nome,
      cidade: loja.pix_cidade || loja.cidade,
      valor,
      txid,
    });

    res.json({
      payload: result.payload,
      qrcode: result.qrBase64,
      valor,
      chave: loja.pix_chave,
      nome_titular: loja.pix_nome_titular || loja.nome,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listar,
  listarAtivas,
  home,
  buscarMinhaLoja,
  buscarPorId,
  buscarPorSlug,
  criar,
  atualizar,
  toggle,
  voltarAutomatico,
  excluir,
  gerarPix,
  atualizarCategoriasDesativadas,
};
