const { supabase, supabaseAdmin } = require('../config/supabase');

const decodeClaims = (token) => {
  const payload = token.split('.')[1];
  if (!payload) {
    const error = new Error('El token de acceso no tiene un formato válido.');
    error.statusCode = 401;
    throw error;
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('El token de acceso no tiene un formato válido.');
    error.statusCode = 401;
    throw error;
  }
};

const throwAuthError = (error) => {
  const message = error?.message || 'Supabase Auth no pudo completar la operación.';
  const normalized = new Error(message);
  normalized.code = error?.code || error?.name;
  normalized.statusCode = error?.status || error?.statusCode;
  if (['email_exists', 'user_already_exists'].includes(normalized.code)) {
    normalized.code = 'auth/email-already-exists';
  } else if (['invalid_credentials', 'invalid_grant'].includes(normalized.code)) {
    normalized.code = 'INVALID_LOGIN_CREDENTIALS';
  } else if (normalized.code === 'email_not_confirmed') {
    normalized.code = 'EMAIL_NOT_VERIFIED';
    normalized.statusCode = 403;
  }
  throw normalized;
};

const sessionTokens = (session) => {
  if (!session?.access_token || !session?.refresh_token) {
    throw new Error('Supabase Auth no devolvió una sesión completa.');
  }
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
};

const signInWithPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throwAuthError(error);
  return {
    localId: data.user.id,
    email: data.user.email,
    emailVerified: Boolean(data.user.email_confirmed_at),
    idToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
  };
};

const refreshSession = async (refreshToken) => {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error) throwAuthError(error);
  return sessionTokens(data.session);
};

const requestSignupEmailLink = async (email) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: 'sitpay://auth-callback' },
  });
  if (error) throwAuthError(error);
};

const verifySignupEmailTokenHash = async (tokenHash) => {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'signup',
  });
  if (error) throwAuthError(error);
  return {
    user: data.user,
  };
};

const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throwAuthError(error);
};

const verifyPasswordResetOtp = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  if (error) throwAuthError(error);
  if (!data.user || !data.session) {
    throw new Error('Supabase Auth no devolvió la sesión de recuperación.');
  }
  return {
    user: data.user,
    accessToken: data.session.access_token,
  };
};

const revokeSession = async (accessToken) => {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
  if (error) throwAuthError(error);
};

const issueSession = async (email) => {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error) throwAuthError(error);
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error('Supabase Auth no generó el token de sesión.');

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (verifyError) throwAuthError(verifyError);
  return sessionTokens(verified.session);
};

const verifyAccessToken = async (token) => {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throwAuthError(error || new Error('Usuario del token no encontrado.'));
  const claims = decodeClaims(token);
  if (claims.sub !== data.user.id || !Number.isInteger(claims.auth_time)) {
    const invalidToken = new Error('El token de acceso no contiene las declaraciones esperadas.');
    invalidToken.statusCode = 401;
    throw invalidToken;
  }
  return {
    ...claims,
    uid: data.user.id,
    email: data.user.email,
    email_verified: Boolean(data.user.email_confirmed_at),
  };
};

const auth = {
  createUser: async ({ email, password, emailVerified = false }) => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      ...(password ? { password } : {}),
      email_confirm: emailVerified,
    });
    if (error) throwAuthError(error);
    return { uid: data.user.id, email: data.user.email };
  },
  updateUser: async (userId, values) => {
    const updates = {};
    if (typeof values.password === 'string') updates.password = values.password;
    if (values.emailVerified !== undefined) updates.email_confirm = values.emailVerified;
    if (values.disabled !== undefined) {
      updates.ban_duration = values.disabled ? '876000h' : 'none';
    }
    if (!Object.keys(updates).length) return;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
    if (error) throwAuthError(error);
  },
  deleteUser: async (userId) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throwAuthError(error);
  },
  verifyIdToken: verifyAccessToken,
};

module.exports = {
  auth,
  issueSession,
  refreshSession,
  revokeSession,
  requestPasswordReset,
  requestSignupEmailLink,
  signInWithPassword,
  verifyAccessToken,
  verifyPasswordResetOtp,
  verifySignupEmailTokenHash,
};
