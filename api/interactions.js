import { MAX_BODY, verifyInteraction } from '../interaction-auth.js';
export async function POST(request){
  const publicKey=process.env.DISCORD_PUBLIC_KEY;
  if(!publicKey||!/^[a-f0-9]{64}$/i.test(publicKey))return new Response('Service unavailable',{status:503});
  const length=request.headers.get('content-length');
  if(length&&Number(length)>MAX_BODY)return new Response('Payload too large',{status:413});
  let body;
  try{
    const reader=request.body?.getReader();
    if(!reader)return new Response('Invalid request',{status:400});
    let bytes=0;const chunks=[];
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_BODY){await reader.cancel();return new Response('Payload too large',{status:413});}
      chunks.push(Buffer.from(value));
    }
    body=Buffer.concat(chunks).toString('utf8');
  }catch{return new Response('Invalid request',{status:400});}
  if(!verifyInteraction({publicKey,signature:request.headers.get('x-signature-ed25519'),timestamp:request.headers.get('x-signature-timestamp'),body}))return new Response('Invalid signature',{status:401});
  let interaction;
  try{interaction=JSON.parse(body);}catch{return new Response('Invalid JSON',{status:400});}
  if(!interaction||typeof interaction!=='object'||!Number.isInteger(interaction.type))return new Response('Invalid interaction',{status:400});
  if(interaction.type===1)return Response.json({type:1});
  return Response.json({type:4,data:{content:'Use o bot CENTRAL-DEIC no Discord. Este endpoint ainda não executa os comandos do bot.',flags:64}});
}
