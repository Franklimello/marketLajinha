const userAccountsService = require('../services/userAccountsService');

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
    });
    res.json(userAccountsService.toPublicAccount(account));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  me,
  registerAccountType,
  updateMe,
};
