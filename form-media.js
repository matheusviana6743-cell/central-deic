import { createHash } from 'node:crypto';
export const MAX_IMAGE=2*1024*1024;
export const MAX_GUILD_IMAGES=50*1024*1024;
const signatures={
 'image/png':{ext:'png',valid:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
 'image/jpeg':{ext:'jpg',valid:b=>b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255},
 'image/webp':{ext:'webp',valid:b=>b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'},
};
export function imageType(type,bytes){
 const item=signatures[type];
 return item&&bytes?.length<=MAX_IMAGE&&item.valid(Buffer.from(bytes))?item.ext:null;
}
export function discordImageUrl(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&['cdn.discordapp.com','media.discordapp.net','cdn.discordapp.net','media.discordapp.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&/^\/attachments\/\d+\/\d+\//.test(u.pathname);
 }catch{return false;}
}
export async function downloadGameImage(attachment,request=fetch){
 const type=attachment.contentType;
 if(!Object.hasOwn(signatures,type)||!Number.isSafeInteger(attachment.size)||attachment.size<1||attachment.size>MAX_IMAGE||!discordImageUrl(attachment.url))throw Error('Imagem inválida ou maior que 2 MB');
 const response=await request(attachment.url,{redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok||!response.body)throw Error('Imagem indisponível');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_IMAGE){await reader.cancel();throw Error('Imagem maior que 2 MB');}chunks.push(Buffer.from(value));}
 }finally{reader.releaseLock();}
 const bytes=Buffer.concat(chunks),ext=imageType(type,bytes);
 if(!ext)throw Error('Formato de imagem inválido');
 return {bytes,ext};
}
export function previewKey(payload,photo){
 const h=createHash('sha256').update(JSON.stringify(payload));
 if(photo)h.update(Buffer.from(photo.bytes));
 return h.digest('hex').slice(0,16);
}
export function imageAttachment(photo){
 if(!photo)return null;
 const name='registro.'+photo.ext;
 return {url:'attachment://'+name,file:{attachment:Buffer.from(photo.bytes),name}};
}
