export default async (req) => {
  const url = new URL(req.url);
  const source = await fetch(`${url.origin}/aois-dashboard-preview.html`, { headers:{accept:'text/html'}, signal:AbortSignal.timeout(15000) });
  if (!source.ok) return new Response('Dashboard unavailable.',{status:502});
  let html = await source.text();
  const injection = '<script src="/js/natcorp-survey.js" defer></script>';
  html = html.includes('</body>') ? html.replace('</body>', `${injection}</body>`) : html + injection;
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
};
export const config = { path:'/dashboard', preferStatic:false };
