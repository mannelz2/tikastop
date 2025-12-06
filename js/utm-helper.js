/**
 * Helper centralizado para gerenciar passagem de parâmetros UTM e dados do usuário
 * através de todas as páginas do projeto
 */

/**
 * Extrai todos os parâmetros UTM e ttclid da URL atual
 * @returns {Object} Objeto com todos os parâmetros encontrados
 */
export function getUtmParameters() {
  const urlAtual = new URL(window.location.href);
  const params = new URLSearchParams(urlAtual.search);

  const utmParams = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith("utm_") || key === "ttclid") {
      utmParams[key] = value;
    }
  }

  return utmParams;
}

/**
 * Salva os parâmetros UTM no localStorage para persistência
 * @param {Object} utmParams - Parâmetros UTM para salvar
 */
export function saveUtmToStorage(utmParams = null) {
  const params = utmParams || getUtmParameters();

  if (Object.keys(params).length > 0) {
    try {
      localStorage.setItem('utmParameters', JSON.stringify(params));
    } catch (e) {
      console.error('Erro ao salvar UTM no localStorage:', e);
    }
  }
}

/**
 * Recupera os parâmetros UTM do localStorage
 * @returns {Object} Parâmetros UTM salvos
 */
export function getUtmFromStorage() {
  try {
    const stored = localStorage.getItem('utmParameters');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler UTM do localStorage:', e);
  }
  return {};
}

/**
 * Cria uma URL com todos os parâmetros UTM herdados
 * @param {string} urlDestino - URL de destino (pode ser relativa ou absoluta)
 * @param {Object} extraParams - Parâmetros adicionais para incluir na URL
 * @returns {string} URL completa com todos os parâmetros
 */
export function buildUrlWithUtm(urlDestino, extraParams = {}) {
  // Pega UTMs da URL atual
  const urlParams = getUtmParameters();

  // Tenta pegar UTMs do localStorage como fallback
  const storedParams = getUtmFromStorage();

  // Merge: prioriza URL atual, depois localStorage, depois extraParams
  const allParams = {
    ...storedParams,
    ...urlParams,
    ...extraParams
  };

  // Cria URL de destino
  const urlFinal = new URL(urlDestino, window.location.origin);
  const paramsDestino = new URLSearchParams(urlFinal.search);

  // Adiciona todos os parâmetros
  for (const [key, value] of Object.entries(allParams)) {
    paramsDestino.set(key, value);
  }

  urlFinal.search = paramsDestino.toString();

  return urlFinal.toString();
}

/**
 * Redireciona para uma URL preservando todos os parâmetros UTM
 * @param {string} urlDestino - URL de destino
 * @param {Object} extraParams - Parâmetros adicionais opcionais
 */
export function redirectWithUtm(urlDestino, extraParams = {}) {
  const urlCompleta = buildUrlWithUtm(urlDestino, extraParams);
  window.location.href = urlCompleta;
}

/**
 * Atualiza todos os links na página para incluir parâmetros UTM
 * Útil para links <a href="...">
 * @param {string} selector - Seletor CSS dos links a atualizar (padrão: 'a[href]')
 */
export function updateLinksWithUtm(selector = 'a[href]') {
  const links = document.querySelectorAll(selector);
  const utmParams = getUtmParameters();
  const storedParams = getUtmFromStorage();
  const allParams = { ...storedParams, ...utmParams };

  if (Object.keys(allParams).length === 0) {
    return; // Sem parâmetros para adicionar
  }

  links.forEach(link => {
    const href = link.getAttribute('href');

    // Ignora links externos, âncoras, javascript:, etc
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const url = new URL(href, window.location.origin);

      // Adiciona parâmetros apenas para links internos
      if (url.origin === window.location.origin) {
        for (const [key, value] of Object.entries(allParams)) {
          url.searchParams.set(key, value);
        }
        link.setAttribute('href', url.toString());
      }
    } catch (e) {
      console.warn('Erro ao processar link:', href, e);
    }
  });
}

/**
 * Inicializa o sistema de UTM na página atual
 * - Salva UTMs no localStorage
 * - Atualiza links da página
 */
export function initUtmTracking() {
  // Salva UTMs da URL atual
  saveUtmToStorage();

  // Atualiza links quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateLinksWithUtm();
    });
  } else {
    updateLinksWithUtm();
  }
}

// Auto-inicializa se o módulo for importado
if (typeof window !== 'undefined') {
  // Salva UTMs assim que o script é carregado
  saveUtmToStorage();
}
