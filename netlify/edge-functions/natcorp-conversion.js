export default async function(_request, context) {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const html = await response.text();
  const assets = [
    '<link rel="stylesheet" href="/css/aoie-experience.css">',
    '<script src="/js/natcorp-session.js"></script>',
    '<script src="/js/natcorp-brand.js" defer></script>',
    '<script src="/js/aoie-capability-profile.js" defer></script>',
    '<script src="/js/aoie-dashboard.js" defer></script>'
  ].filter(asset => {
    const src = asset.match(/(?:src|href)="([^"]+)/)?.[1] || '';
    return src && !html.includes(src);
  });

  if (!assets.length) return new Response(html, response);
  const injected = html.replace('</head>', assets.join('') + '</head>');
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
