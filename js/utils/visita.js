/**
 * visita.js — conta a visita no Mapa de Acessos do admin (anônimo).
 *
 * Manda só o caminho da página e se é a 1ª da sessão. O local (país/estado/cidade) é
 * descoberto pelo Cloudflare no Worker rank; IP, cookie e identificador NÃO são guardados.
 * Respeita "Não rastrear" (DNT) e Global Privacy Control. Falha sempre em silêncio.
 * Ver SQL/visitas-mapa.sql e Workers/rank.agencydmaior.com.br.txt (POST /visita).
 */
(function () {
  try {
    if (!/(^|\.)agencydmaior\.com\.br$/.test(location.hostname)) return;      // só produção
    if (/^\/(admin|adminsub)(\/|$)/.test(location.pathname)) return;           // nunca conta o admin
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;

    var nova = true;
    try {
      nova = !sessionStorage.getItem('dm_vs');
      sessionStorage.setItem('dm_vs', '1');
    } catch (e) {}

    // text/plain evita o preflight de CORS
    fetch('https://rank.agencydmaior.com.br/visita', {
      method: 'POST',
      body: JSON.stringify({ p: location.pathname, n: nova }),
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
      credentials: 'omit',
    }).catch(function () {});
  } catch (e) {}
})();
