const { prisma } = require('../config/database');

const POST_EXPIRATION_HOURS = 72;
const MAX_POSTS_ATIVOS_POR_LOJA = 3;

function dataExpiracaoPadrao() {
  return new Date(Date.now() + POST_EXPIRATION_HOURS * 60 * 60 * 1000);
}

function normalizarTipoPost(postType) {
  const tipo = String(postType || 'normal').toLowerCase();
  return tipo === 'poll' ? 'poll' : 'normal';
}

function sanitizarOpcoesEnquete(options) {
  if (!Array.isArray(options)) return [];
  const limpas = options
    .map((opt) => String(opt || '').trim())
    .filter(Boolean);
  return [...new Set(limpas)].slice(0, 10);
}

async function resolverCidadeDaLoja(loja) {
  if (loja?.cidade_id) return loja.cidade_id;
  const cidadeNome = String(loja?.cidade || '').trim();
  if (!cidadeNome) return null;

  const cidade = await prisma.cidades.findFirst({
    where: { nome: { equals: cidadeNome, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!cidade?.id) return null;

  await prisma.lojas.update({
    where: { id: loja.id },
    data: { cidade_id: cidade.id },
  }).catch(() => {});

  return cidade.id;
}

async function criarPostDaLoja(lojaId, payload) {
  const loja = await prisma.lojas.findUnique({
    where: { id: lojaId },
    select: { id: true, cidade: true, cidade_id: true },
  });
  if (!loja) {
    const err = new Error('Loja não encontrada.');
    err.status = 404;
    throw err;
  }

  const cityId = await resolverCidadeDaLoja(loja);
  if (!cityId) {
    const err = new Error('Não foi possível identificar a cidade da loja. Atualize o cadastro da loja.');
    err.status = 400;
    throw err;
  }

  const content = String(payload?.content || '').trim();
  if (!content) {
    const err = new Error('Conteúdo do post é obrigatório.');
    err.status = 400;
    throw err;
  }

  const postType = normalizarTipoPost(payload?.post_type);
  let pollOptions = null;
  if (postType === 'poll') {
    const options = sanitizarOpcoesEnquete(payload?.poll_options);
    if (options.length < 2) {
      const err = new Error('Enquete deve ter ao menos 2 opções válidas.');
      err.status = 400;
      throw err;
    }
    pollOptions = options;
  }

  const totalAtivos = await prisma.storePost.count({
    where: {
      store_id: lojaId,
      expires_at: { gt: new Date() },
    },
  });
  if (totalAtivos >= MAX_POSTS_ATIVOS_POR_LOJA) {
    const err = new Error('Limite de 3 posts ativos atingido. Aguarde expirar para criar outro.');
    err.status = 409;
    throw err;
  }

  return prisma.storePost.create({
    data: {
      store_id: lojaId,
      city_id: cityId,
      content,
      image_url: payload?.image_url ? String(payload.image_url).trim() : null,
      post_type: postType,
      poll_options: postType === 'poll' ? pollOptions : null,
      expires_at: dataExpiracaoPadrao(),
    },
    select: {
      id: true,
      store_id: true,
      city_id: true,
      content: true,
      image_url: true,
      post_type: true,
      poll_options: true,
      created_at: true,
      expires_at: true,
    },
  });
}

async function listarPostsAtivosPorCidade(cityId, clienteId = null) {
  const now = new Date();
  const posts = await prisma.storePost.findMany({
    where: {
      city_id: cityId,
      expires_at: { gt: now },
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      store_id: true,
      city_id: true,
      content: true,
      image_url: true,
      post_type: true,
      poll_options: true,
      created_at: true,
      expires_at: true,
      store: { select: { id: true, nome: true, logo_url: true, slug: true } },
    },
  });

  if (!posts.length) return [];
  const postIds = posts.map((p) => p.id);

  const [likesAgg, commentsAgg, votesAgg, userLikes, userVotes, voteResults] = await Promise.all([
    prisma.postLike.groupBy({
      by: ['post_id'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.postComment.groupBy({
      by: ['post_id'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.postVote.groupBy({
      by: ['post_id'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    }),
    clienteId
      ? prisma.postLike.findMany({
          where: { post_id: { in: postIds }, user_id: clienteId },
          select: { post_id: true },
        })
      : Promise.resolve([]),
    clienteId
      ? prisma.postVote.findMany({
          where: { post_id: { in: postIds }, user_id: clienteId },
          select: { post_id: true },
        })
      : Promise.resolve([]),
    prisma.postVote.groupBy({
      by: ['post_id', 'option_selected'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    }),
  ]);

  const likeCountMap = new Map(likesAgg.map((r) => [r.post_id, Number(r._count?._all || 0)]));
  const commentCountMap = new Map(commentsAgg.map((r) => [r.post_id, Number(r._count?._all || 0)]));
  const voteCountMap = new Map(votesAgg.map((r) => [r.post_id, Number(r._count?._all || 0)]));
  const likedSet = new Set(userLikes.map((r) => r.post_id));
  const votedSet = new Set(userVotes.map((r) => r.post_id));

  const voteByOptionMap = new Map();
  for (const row of voteResults) {
    if (!voteByOptionMap.has(row.post_id)) voteByOptionMap.set(row.post_id, []);
    voteByOptionMap.get(row.post_id).push({
      option_selected: row.option_selected,
      count: Number(row._count?._all || 0),
    });
  }

  return posts.map((post) => ({
    ...post,
    like_count: likeCountMap.get(post.id) || 0,
    comment_count: commentCountMap.get(post.id) || 0,
    vote_count: voteCountMap.get(post.id) || 0,
    has_liked: likedSet.has(post.id),
    has_voted: votedSet.has(post.id),
    vote_results: voteByOptionMap.get(post.id) || [],
  }));
}

async function toggleLike(postId, clienteId) {
  const existing = await prisma.postLike.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: clienteId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.postLike.delete({
      where: { post_id_user_id: { post_id: postId, user_id: clienteId } },
    });
  } else {
    await prisma.postLike.create({
      data: { post_id: postId, user_id: clienteId },
    });
  }

  const likeCount = await prisma.postLike.count({ where: { post_id: postId } });
  return { has_liked: !existing, like_count: likeCount };
}

async function comentarPost(postId, clienteId, comment) {
  const texto = String(comment || '').trim();
  if (!texto) {
    const err = new Error('Comentário é obrigatório.');
    err.status = 400;
    throw err;
  }

  const created = await prisma.postComment.create({
    data: {
      post_id: postId,
      user_id: clienteId,
      comment: texto,
    },
    select: {
      id: true,
      comment: true,
      created_at: true,
      user: { select: { id: true, nome: true } },
    },
  });

  const commentCount = await prisma.postComment.count({ where: { post_id: postId } });
  return { comment: created, comment_count: commentCount };
}

async function listarComentarios(postId) {
  return prisma.postComment.findMany({
    where: { post_id: postId },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      comment: true,
      created_at: true,
      user: { select: { id: true, nome: true } },
    },
  });
}

async function votarEnquete(postId, clienteId, optionSelected) {
  const post = await prisma.storePost.findUnique({
    where: { id: postId },
    select: { id: true, post_type: true, poll_options: true, expires_at: true },
  });
  if (!post) {
    const err = new Error('Post não encontrado.');
    err.status = 404;
    throw err;
  }
  if (post.expires_at <= new Date()) {
    const err = new Error('Este post expirou.');
    err.status = 400;
    throw err;
  }
  if (post.post_type !== 'poll') {
    const err = new Error('Este post não é uma enquete.');
    err.status = 400;
    throw err;
  }

  const option = String(optionSelected || '').trim();
  const options = Array.isArray(post.poll_options) ? post.poll_options.map((o) => String(o)) : [];
  if (!option || !options.includes(option)) {
    const err = new Error('Opção de voto inválida.');
    err.status = 400;
    throw err;
  }

  try {
    await prisma.postVote.create({
      data: {
        post_id: postId,
        user_id: clienteId,
        option_selected: option,
      },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      const err = new Error('Você já votou nesta enquete.');
      err.status = 409;
      throw err;
    }
    throw e;
  }

  const grouped = await prisma.postVote.groupBy({
    by: ['option_selected'],
    where: { post_id: postId },
    _count: { _all: true },
  });

  return grouped.map((g) => ({
    option_selected: g.option_selected,
    count: Number(g._count?._all || 0),
  }));
}

module.exports = {
  criarPostDaLoja,
  listarPostsAtivosPorCidade,
  toggleLike,
  comentarPost,
  listarComentarios,
  votarEnquete,
};
