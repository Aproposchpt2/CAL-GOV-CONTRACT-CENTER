export default async function handler(request, context) {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const html = await response.text();
  const requested = [
    '<script src="/js/natcorp-session.js"></script>',
    '<script src="/js/natcorp-brand.js" defer></script>',
    '<script src="/js/aois-advisor.js" defer></script>'
  ];
  const scripts = requested.filter((script) => {
    const src = script.match(/src="([^"]+)/)?.[1] || '';
    return src && !html.includes(src);
  });
  if (!scripts.length || !html.includes('</head>')) return new Response(html, response);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(html.replace('</head>', scripts.join('') + '</head>'), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
