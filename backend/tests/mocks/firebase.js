/**
 * Mock do Firebase Admin para testes.
 */
const verifyIdToken = jest.fn();
const getAuth = jest.fn(() => ({ verifyIdToken }));
const isFirebaseInitialized = jest.fn(() => true);

module.exports = { getAuth, isFirebaseInitialized, verifyIdToken };
