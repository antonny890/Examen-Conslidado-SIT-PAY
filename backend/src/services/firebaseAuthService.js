const { auth } = require('../config/firebase');

const getApiKey = () => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    const error = new Error('Firebase Authentication REST API key is not configured.');
    error.statusCode = 503;
    throw error;
  }
  return apiKey;
};

const requestIdentityToolkit = async (endpoint, body) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${getApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Firebase Authentication request failed.');
    error.firebaseCode = result?.error?.message;
    error.statusCode = response.status;
    throw error;
  }
  return result;
};

const signInWithPassword = (email, password) =>
  requestIdentityToolkit('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

const signInWithCustomToken = async (uid) => {
  const customToken = await auth.createCustomToken(uid);
  return requestIdentityToolkit('accounts:signInWithCustomToken', {
    token: customToken,
    returnSecureToken: true,
  });
};

const refreshIdToken = async (refreshToken) => {
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${getApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Firebase token refresh failed.');
    error.firebaseCode = result?.error?.message;
    error.statusCode = response.status;
    throw error;
  }
  return result;
};

module.exports = {
  refreshIdToken,
  signInWithCustomToken,
  signInWithPassword,
};
