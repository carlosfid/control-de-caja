import type { FastifyInstance } from 'fastify';
import type { SyncService } from '../services/sync-service';

export function registerDemoRoutes(server: FastifyInstance, service: SyncService): void {
  server.get('/demo/state', async () => service.getState());

  server.post('/demo/config', async (request) => {
    const body = request.body as { amountLimitMinor?: number; rejectNextN?: number };
    service.setConfig({
      amountLimitMinor: body.amountLimitMinor,
      forcedRejectCount: body.rejectNextN,
    });
    return service.getConfig();
  });

  server.post('/demo/close-session/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const closed = service.closeSession(params.id);
    return closed ? { ok: true } : reply.code(404).send({ code: 'SESSION_NOT_FOUND' });
  });

  server.post('/demo/reset', async () => {
    service.reset();
    return { ok: true };
  });

  server.get('/', async (_request, reply) => {
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>ERP simulado</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}.sim{background:#fff3cd;padding:10px;border:1px solid #e6b800;margin-bottom:16px}</style></head>
<body><div class="sim"><strong>SIMULACIÓN — no es el ERP real</strong></div><h1>Sincronización</h1>
<div id="state">Cargando...</div><script>
async function refresh(){const r=await fetch('/demo/state');const s=await r.json();document.querySelector('#state').innerHTML=
'<p>Total: '+s.total+' | Aceptados: '+s.accepted+' | Duplicados: '+s.duplicates+' | Rechazados: '+s.rejected+'</p>'+ '<table><thead><tr><th>Record</th><th>Tipo</th><th>Resultado</th><th>Motivo</th><th>Hora</th></tr></thead><tbody>'+s.latest.map(x=>' <tr><td>'+x.recordId+'</td><td>'+x.kind+'</td><td>'+x.result+'</td><td>'+ (x.reason||'')+'</td><td>'+x.receivedAt+'</td></tr>').join('')+'</tbody></table>'};refresh();setInterval(refresh,3000);
</script></body></html>`;
    return reply.type('text/html').send(html);
  });
}
