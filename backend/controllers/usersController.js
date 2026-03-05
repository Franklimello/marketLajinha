const userAccountsService = require('../services/userAccountsService');
const { salvarTokenPrestador, removerTokenPrestadorDoUsuario } = require('../services/notificacaoService');

async function me(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const account = await userAccountsService.getOrCreateFromFirebase(req.firebaseDecoded);
    res.json(userAccountsService.toPublicAccount(account));
  } catch (e) {
    next(e);
  }
}

async function registerAccountType(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }

    const payload = {
      accountType: req.validated.accountType,
      city: req.validated.city,
      name: req.validated.name,
    };

    const account = await userAccountsService.registerAccountType(req.firebaseDecoded, payload);
    res.json(userAccountsService.toPublicAccount(account));
  } catch (e) {
    next(e);
  }
}

async function updateMe(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const account = await userAccountsService.updateMyProfile(req.firebaseDecoded, {
      name: req.validated.name,
      city: req.validated.city,
      accountType: req.validated.accountType,
      profile_image_url: req.validated.profile_image_url,
      about: req.validated.about,
      phone: req.validated.phone,
      whatsapp: req.validated.whatsapp,
      instagram: req.validated.instagram,
      address: req.validated.address,
      business_hours: req.validated.business_hours,
    });
    res.json(userAccountsService.toPublicAccount(account));
  } catch (e) {
    next(e);
  }
}

async function saveMyFcmToken(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ erro: 'Token FCM obrigatório.' });
    const account = await userAccountsService.getOrCreateFromFirebase(req.firebaseDecoded);
    await salvarTokenPrestador(account.id, token);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function removeMyFcmToken(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Token Firebase obrigatório.' });
    }
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ erro: 'Token FCM obrigatório.' });
    const account = await userAccountsService.getOrCreateFromFirebase(req.firebaseDecoded);
    await removerTokenPrestadorDoUsuario(account.id, token);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  me,
  registerAccountType,
  updateMe,
  saveMyFcmToken,
  removeMyFcmToken,
};
