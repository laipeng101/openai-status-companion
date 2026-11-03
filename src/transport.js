export const REQUEST_TIMEOUT = 15_000;
export function request(url, responseType = 'text') {
  const error = (code, status) => Object.assign(new Error(code), {code, status});
  if (new URL(url).origin !== 'https://status.openai.com') return Promise.reject(error('errorNetwork'));
  if (typeof GM_xmlhttpRequest === 'function') {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method:'GET', url, timeout:REQUEST_TIMEOUT, responseType, anonymous:true, nocache:true,
        headers:{Accept:responseType === 'json' ? 'application/json' : 'text/html'},
        onload(response) {
          if (response.status < 200 || response.status >= 300) return reject(error('errorHttp', response.status));
          if (responseType === 'text') return resolve(String(response.responseText || response.response || ''));
          if (response.response && typeof response.response === 'object') return resolve(response.response);
          try { resolve(JSON.parse(response.responseText)); } catch { reject(error('errorParse')); }
        },
        ontimeout:() => reject(error('errorTimeout')), onerror:() => reject(error('errorNetwork')),
        onabort:() => reject(error('errorNetwork')),
      });
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  return fetch(url, {signal:controller.signal, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'})
    .then(async response => {
      if (!response.ok) throw error('errorHttp', response.status);
      try { return await (responseType === 'json' ? response.json() : response.text()); }
      catch { throw error(controller.signal.aborted ? 'errorTimeout' : 'errorParse'); }
    }).catch(cause => { throw cause?.code ? cause : error(controller.signal.aborted ? 'errorTimeout' : 'errorNetwork'); })
    .finally(() => clearTimeout(timer));
}
