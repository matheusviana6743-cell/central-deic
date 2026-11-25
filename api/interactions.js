import { createPublicKey, verify } from 'node:crypto';

const publicKey = process.env.DISCORD_PUBLIC_KEY;

export async function POST(request) {
  if (!publicKey) return new Response('Public key missing', { status: 503 });

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp || !/^[0-9a-f]{128}$/i.test(signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = await request.text();
  const key = createPublicKey({
    key: Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKey, 'hex'),
    ]),
    format: 'der',
    type: 'spki',
  });
  const valid = verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, 'hex'));
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const interaction = JSON.parse(body);
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  return Response.json({
    type: 4,
    data: {
      content: 'A versão para Vercel está em preparação. O bot atual continua disponível na instalação local.',
      flags: 64,
    },
  });
}
