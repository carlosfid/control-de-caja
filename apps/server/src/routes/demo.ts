import type { FastifyInstance } from 'fastify';
import type { SyncService } from '../services/sync-service';

export function registerDemoRoutes(
  server: FastifyInstance,
  service: SyncService,
): void {
  server.get('/demo/state', async () => service.getState());

  if (process.env.NODE_ENV !== 'production') {
    server.post('/demo/config', async (request, reply) => {
      const body = request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }
      const config = body as Record<string, unknown>;
      const allowedKeys = [
        'amountLimitMinor',
        'rejectNextN',
        'latencyMs',
        'failNextN',
        'loseResponseNextN',
      ];
      if (Object.keys(config).some((key) => !allowedKeys.includes(key))) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }
      for (const [key, value] of Object.entries(config)) {
        const max =
          key === 'latencyMs'
            ? 60_000
            : key === 'amountLimitMinor'
              ? Number.MAX_SAFE_INTEGER
              : 1_000_000;
        if (
          !Number.isSafeInteger(value) ||
          (value as number) < 0 ||
          (value as number) > max
        ) {
          return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
        }
      }
      service.setConfig({
        amountLimitMinor: config.amountLimitMinor as number | undefined,
        forcedRejectCount: config.rejectNextN as number | undefined,
        latencyMs: config.latencyMs as number | undefined,
        failNextCount: config.failNextN as number | undefined,
        loseResponseCount: config.loseResponseNextN as number | undefined,
      });
      return service.getConfig();
    });

    server.post('/demo/close-session/:id', async (request, reply) => {
      const params = request.params as { id: string };
      if (!params.id || params.id.length > 128) {
        return reply.code(400).send({ code: 'INVALID_PAYLOAD' });
      }
      const closed = service.closeSession(params.id);
      return closed
        ? { ok: true }
        : reply.code(404).send({ code: 'SESSION_NOT_FOUND' });
    });

    server.post('/demo/reset', async () => {
      service.reset();
      return { ok: true };
    });
  }

  server.get('/', async (_request, reply) => {
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>ERP simulado</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}.sim{background:#fff3cd;padding:10px;border:1px solid #e6b800;margin-bottom:16px}form{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:16px 0}label{display:grid;gap:4px}input{width:120px;padding:6px}button{padding:7px 12px}</style></head>
<body><div class="sim"><strong>SIMULACIÓN — no es el ERP real</strong></div><h1>Sincronización</h1>
<form id="controls">
  <label>Límite por movimiento (centavos)<input name="amountLimitMinor" type="number" min="0" step="1" value="10000000"></label>
  <label>Rechazar próximos N<input name="rejectNextN" type="number" min="0" step="1" value="0"></label>
  <label>Latencia (ms)<input name="latencyMs" type="number" min="0" max="60000" step="1" value="0"></label>
  <label>Responder 503 próximos N<input name="failNextN" type="number" min="0" step="1" value="0"></label>
  <label>Perder respuesta próximos N<input name="loseResponseNextN" type="number" min="0" step="1" value="0"></label>
  <button type="submit">Aplicar controles</button>
  <button id="reset" type="button">Restablecer demo</button>
</form>
<p id="control-status" role="status"></p>
<div id="state">Cargando...</div><script>
const state=document.querySelector('#state');
const controlStatus=document.querySelector('#control-status');
const controls=document.querySelector('#controls');
controls.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=new FormData(controls);
  const payload=Object.fromEntries(['amountLimitMinor','rejectNextN','latencyMs','failNextN','loseResponseNextN'].map(key=>[key,Number(form.get(key))]));
  try{
    const response=await fetch('/demo/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('HTTP '+response.status);
    controlStatus.textContent='Controles de demostración actualizados.';
  }catch(error){
    console.error('Unable to update demo configuration',error);
    controlStatus.textContent='No se pudieron actualizar los controles.';
  }
});
document.querySelector('#reset').addEventListener('click',async()=>{
  try{
    const response=await fetch('/demo/reset',{method:'POST'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    for(const input of controls.querySelectorAll('input'))input.value=input.name==='amountLimitMinor'?'10000000':'0';
    controlStatus.textContent='Demostración restablecida.';
    await refresh();
  }catch(error){
    console.error('Unable to reset demo',error);
    controlStatus.textContent='No se pudo restablecer la demostración.';
  }
});
async function refresh(){
  try{
    const response=await fetch('/demo/state');
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    state.replaceChildren();
    const summary=document.createElement('p');
    summary.textContent='Total: '+data.total+' | Aceptados: '+data.accepted+' | Duplicados: '+data.duplicates+' | Rechazados: '+data.rejected;
    state.append(summary);
    const table=document.createElement('table');
    const head=document.createElement('thead');
    const headerRow=document.createElement('tr');
    for(const label of ['Record','Tipo','Resultado','Motivo','Hora']){
      const cell=document.createElement('th');cell.textContent=label;headerRow.append(cell);
    }
    head.append(headerRow);table.append(head);
    const body=document.createElement('tbody');
    for(const entry of data.latest){
      const row=document.createElement('tr');
      for(const value of [entry.recordId,entry.kind,entry.result,entry.reason||'',entry.receivedAt]){
        const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);
      }
      body.append(row);
    }
    table.append(body);state.append(table);
  }catch(error){
    console.error('Unable to refresh demo state', error);
    state.textContent='No se pudo cargar el estado del servidor.';
  }
}
refresh();setInterval(refresh,3000);
</script></body></html>`;
    return reply.type('text/html').send(html);
  });
}
