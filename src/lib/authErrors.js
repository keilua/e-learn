/**
 * SEC-005 — Messages d'erreur d'authentification sans énumération de comptes.
 * Toute erreur de connexion produit le même message, que l'email existe ou non,
 * que le compte soit confirmé, banni ou que le mot de passe soit faux. Seule une
 * panne réseau (qui ne dit rien du compte) est signalée différemment.
 */

export const LOGIN_FAILED_MESSAGE = 'Invalid email or password. Please check your credentials.';
export const NETWORK_ERROR_MESSAGE = 'Network error. Please check your internet connection.';
export const REGISTER_FAILED_MESSAGE = 'Could not create account. Please check your information and try again.';

const isNetworkError = (error) =>
  error instanceof TypeError || /failed to fetch|network/i.test(error?.message || '');

export const loginErrorMessage = (error) =>
  isNetworkError(error) ? NETWORK_ERROR_MESSAGE : LOGIN_FAILED_MESSAGE;

export const registerErrorMessage = (error) => {
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
  // Les règles de mot de passe ne révèlent rien sur l'existence d'un compte.
  if (error?.code === 'weak_password' || /^password/i.test(error?.message || '')) return error.message;
  return REGISTER_FAILED_MESSAGE;
};
