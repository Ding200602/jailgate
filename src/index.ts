import Fastify from 'fastify';
import { Router } from './router';

const app = Fastify({ logger: true });
const router = new Router();

// OpenAI 兼容出口：/v1/chat/completions
app.post('/v1/chat/completions', async (req, reply) => {
  const body: any = req.body ?? {};
  const model: string = body.model || 'default';
  const result = await router.route(model, body);

  if (result.streaming) {
    // SSE 流式透传
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive'
    });
    reply.raw.write(result.body);
    reply.raw.end();
    return;
  }
  reply.send(JSON.parse(result.body));
});

app.get('/v1/models', async () => {
  return router.listModels();
});

app.get('/health', async () => ({ ok: true, name: 'jailgate' }));

app.listen({ port: router.port, host: router.host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`jailgate listening on http://${router.host}:${router.port}/v1`);
});
