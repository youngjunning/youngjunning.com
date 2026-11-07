// Vercount provides a free Busuanzi-compatible counter, using a JSON API.
export function canTrackVisits(hostname, production) {
  return production && hostname !== 'localhost' && !hostname.endsWith('.localhost')
    && !hostname.endsWith('.local') && !hostname.includes(':')
    && !/^\d+(?:\.\d+){3}$/.test(hostname);
}

/**
 * @param {(counts: { sitePv: number, siteUv: number } | null) => void} onResult
 */
export function requestSiteVisits(onResult, { browser = window, page = document, timeout = 10000 } = {}) {
  const controller = new AbortController();
  let settled = false;
  const timer = browser.setTimeout(() => { controller.abort(); finish(null); }, timeout);
  function finish(counts) {
    if (settled) return;
    settled = true;
    browser.clearTimeout(timer);
    onResult(counts);
  }

  void (async () => {
    try {
      const isNewUv = !page.cookie.split(';').some((cookie) => cookie.trim() === 'zisheng_visit_counted=1');
      // Like Vercount's official client, mark before sending to avoid duplicate UV on rapid navigation.
      page.cookie = `zisheng_visit_counted=1; Path=/; Max-Age=31536000; SameSite=Lax${browser.location.protocol === 'https:' ? '; Secure' : ''}`;
      const response = await browser.fetch('https://events.vercount.one/api/v2/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `${browser.location.origin}/`, isNewUv }),
        referrerPolicy: 'no-referrer',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Visit counter unavailable');
      const payload = await response.json();
      const data = payload?.status === 'success' ? payload.data : null;
      const valid = data && ['site_pv', 'site_uv'].every((key) => Number.isSafeInteger(data[key]) && data[key] >= 0);
      finish(valid ? { sitePv: data.site_pv, siteUv: data.site_uv } : null);
    } catch { finish(null); }
  })();

  return () => {
    settled = true;
    browser.clearTimeout(timer);
    controller.abort();
  };
}
