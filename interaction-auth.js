import { createPublicKey, verify } from 'node:crypto';
export const MAX_BODY=262144;
export function verifyInteraction({publicKey,signature,timestamp,body,now=Math.floor(Date.now()/1000)}){
  if(typeof publicKey!=='string'||!/^[a-f0-9]{64}$/i.test(publicKey))return false;
  if(typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature))return false;
  if(typeof timestamp!=='string'||!/^\d{1,12}$/.test(timestamp)||Math.abs(now-Number(timestamp))>300)return false;
  if(typeof body!=='string'||Buffer.byteLength(body)>MAX_BODY)return false;
  try{
    const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(publicKey,'hex')]),format:'der',type:'spki'});
    return verify(null,Buffer.from(timestamp+body),key,Buffer.from(signature,'hex'));
  }catch{return false;}
}
