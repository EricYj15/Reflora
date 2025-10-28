/**
 * Utilitário para construir URLs da API
 * Em produção: usa REACT_APP_API_URL
 * Em desenvolvimento: usa o proxy configurado no package.json
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Constrói a URL completa para um endpoint da API
 * @param {string} path - Caminho do endpoint (ex: '/api/products')
 * @returns {string} URL completa
 */
export function buildApiUrl(path) {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

/**
 * Wrapper para fetch com URL da API configurada
 * @param {string} path - Caminho do endpoint
 * @param {RequestInit} options - Opções do fetch
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const url = buildApiUrl(path);
  return fetch(url, options);
}

/**
 * Verifica se a API está configurada corretamente
 * @returns {boolean}
 */
export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}

/**
 * Obtém a URL base da API
 * @returns {string}
 */
export function getApiBaseUrl() {
  return API_BASE_URL || window.location.origin;
}
