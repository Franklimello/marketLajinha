const admin = require('firebase-admin');
const { prisma } = require('../config/database');
const { isFirebaseInitialized } = require('../config/firebase');

const STATUS_MENSAGENS = {
  PENDING: { titulo: 'Pedido recebido', corpo: 'Seu pedido foi recebido e está aguardando aprovação.' },
  APPROVED: { titulo: 'Pedido aprovado!', corpo: 'Seu pedido foi aprovado e está sendo preparado.' },
  IN_ROUTE: { titulo: 'Saiu para entrega!', corpo: 'Seu pedido saiu para entrega. Fique atento!' },
  DELIVERED: { titulo: 'Pedido entregue!', corpo: 'Seu pedido foi entregue. Bom apetite!' },
  CANCELLED: { titulo: 'Pedido cancelado', corpo: 'Infelizmente seu pedido foi cancelado.' },
};

async function salvarToken(clienteId, token) {
  return prisma.fcmToken.upsert({
    where: { token },
    update: { cliente_id: clienteId },
    create: { cliente_id: clienteId, token },
  });
}

async function removerToken(token) {
  return prisma.fcmToken.deleteMany({ where: { token } });
}

async function notificarCliente(clienteId, status, pedidoId, nomeLoja) {
  if (!isFirebaseInitialized()) {
    console.warn('[Notificação] Firebase não inicializado. Push não enviado.');
    return;
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { cliente_id: clienteId },
    select: { token: true },
  });

  if (tokens.length === 0) {
    console.log(`[Notificação] Cliente ${clienteId} sem tokens FCM.`);
    return;
  }

  const info = STATUS_MENSAGENS[status] || { titulo: 'Atualização do pedido', corpo: `Status: ${status}` };
  const titulo = `${info.titulo}`;
  const corpo = nomeLoja ? `${nomeLoja}: ${info.corpo}` : info.corpo;

  const tokensValidos = tokens.map((t) => t.token);
  const tokensInvalidos = [];

  for (const token of tokensValidos) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: titulo,
          body: corpo,
        },
        data: {
          pedidoId: pedidoId || '',
          status: status || '',
          url: '/pedidos',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'pedidos',
            priority: 'high',
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [{ action: 'ver', title: 'Ver pedido' }],
          },
          fcmOptions: { link: '/pedidos' },
        },
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        tokensInvalidos.push(token);
      } else {
        console.error(`[Notificação] Erro ao enviar para token: ${err.message}`);
      }
    }
  }

  if (tokensInvalidos.length > 0) {
    await prisma.fcmToken.deleteMany({ where: { token: { in: tokensInvalidos } } });
    console.log(`[Notificação] ${tokensInvalidos.length} token(s) inválido(s) removido(s).`);
  }
}

async function salvarTokenLoja(usuarioId, token) {
  return prisma.fcmTokenLoja.upsert({
    where: { token },
    update: { usuario_id: usuarioId },
    create: { usuario_id: usuarioId, token },
  });
}

async function removerTokenLoja(token) {
  return prisma.fcmTokenLoja.deleteMany({ where: { token } });
}

async function notificarLoja(lojaId, titulo, corpo, dados = {}) {
  if (!isFirebaseInitialized()) {
    console.warn('[Notificação Loja] Firebase não inicializado.');
    return;
  }

  const tokens = await prisma.fcmTokenLoja.findMany({
    where: { usuario: { loja_id: lojaId } },
    select: { token: true },
  });

  if (tokens.length === 0) {
    console.log(`[Notificação Loja] Loja ${lojaId} sem tokens FCM.`);
    return;
  }

  const tokensInvalidos = [];

  for (const { token } of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: { title: titulo, body: corpo },
        data: dados,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'pedidos', priority: 'high' },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [300, 100, 300, 100, 300],
            requireInteraction: true,
          },
        },
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        tokensInvalidos.push(token);
      } else {
        console.error(`[Notificação Loja] Erro: ${err.message}`);
      }
    }
  }

  if (tokensInvalidos.length > 0) {
    await prisma.fcmTokenLoja.deleteMany({ where: { token: { in: tokensInvalidos } } });
  }
}

async function notificarClienteChat(clienteId, { pedidoId, nomeLoja = '', mensagem = '', possuiAnexo = false } = {}) {
  if (!isFirebaseInitialized()) {
    console.warn('[Notificação Chat Cliente] Firebase não inicializado.');
    return;
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { cliente_id: clienteId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const preview = mensagem
    ? String(mensagem).trim()
    : (possuiAnexo ? 'A loja enviou um anexo no chat.' : 'A loja enviou uma nova mensagem.');
  const bodyBase = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;
  const corpo = nomeLoja ? `${nomeLoja}: ${bodyBase}` : bodyBase;
  const tokensInvalidos = [];

  for (const { token } of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: 'Nova mensagem da loja',
          body: corpo,
        },
        data: {
          tipo: 'chat',
          pedidoId: String(pedidoId || ''),
          url: '/pedidos',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat',
            priority: 'high',
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: pedidoId ? `chat-${pedidoId}` : 'chat-cliente',
          },
          fcmOptions: { link: '/pedidos' },
        },
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        tokensInvalidos.push(token);
      } else {
        console.error(`[Notificação Chat Cliente] Erro: ${err.message}`);
      }
    }
  }

  if (tokensInvalidos.length > 0) {
    await prisma.fcmToken.deleteMany({ where: { token: { in: tokensInvalidos } } });
  }
}

async function notificarLojaChat(lojaId, { pedidoId, nomeCliente = '', mensagem = '', possuiAnexo = false } = {}) {
  const preview = mensagem
    ? String(mensagem).trim()
    : (possuiAnexo ? 'O cliente enviou um anexo no chat.' : 'O cliente enviou uma nova mensagem.');
  const bodyBase = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;
  const corpo = nomeCliente ? `${nomeCliente}: ${bodyBase}` : bodyBase;

  return notificarLoja(
    lojaId,
    'Nova mensagem no chat',
    corpo,
    {
      tipo: 'chat',
      pedidoId: String(pedidoId || ''),
      url: pedidoId ? `/pedidos/${pedidoId}` : '/pedidos',
    }
  );
}

async function notificarTodosClientesNovoCupom({ lojaId, codigoCupom, valorDesconto, tipoDesconto } = {}) {
  if (!isFirebaseInitialized()) {
    console.warn('[Notificação Cupom] Firebase não inicializado.');
    return;
  }

  const [loja, tokens] = await Promise.all([
    prisma.lojas.findUnique({
      where: { id: lojaId },
      select: { nome: true },
    }),
    prisma.fcmToken.findMany({
      select: { token: true },
    }),
  ]);

  if (tokens.length === 0) return;

  const nomeLoja = loja?.nome || 'Uma loja'
  const codigo = String(codigoCupom || '').toUpperCase().trim()
  const valor = Number(valorDesconto || 0)
  const valorTexto = tipoDesconto === 'PERCENTAGE'
    ? `${valor}% OFF`
    : `R$ ${valor.toFixed(2).replace('.', ',')} OFF`

  const titulo = 'Novo cupom disponível!'
  const corpo = codigo
    ? `${nomeLoja} criou o cupom ${codigo} (${valorTexto}).`
    : `${nomeLoja} acabou de criar um novo cupom para você.`

  const tokensInvalidos = [];
  for (const { token } of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: titulo,
          body: corpo,
        },
        data: {
          tipo: 'cupom',
          lojaId: String(lojaId || ''),
          codigoCupom: codigo,
          url: '/',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'promocoes',
            priority: 'high',
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [220, 80, 220],
            requireInteraction: true,
            tag: `cupom-${lojaId || 'geral'}-${codigo || 'novo'}`,
          },
          fcmOptions: { link: '/' },
        },
      });
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        tokensInvalidos.push(token);
      } else {
        console.error(`[Notificação Cupom] Erro: ${err.message}`);
      }
    }
  }

  if (tokensInvalidos.length > 0) {
    await prisma.fcmToken.deleteMany({ where: { token: { in: tokensInvalidos } } });
  }
}

module.exports = {
  salvarToken,
  removerToken,
  notificarCliente,
  salvarTokenLoja,
  removerTokenLoja,
  notificarLoja,
  notificarClienteChat,
  notificarLojaChat,
  notificarTodosClientesNovoCupom,
};
