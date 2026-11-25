import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyInteraction,MAX_BODY } from '../interaction-auth.js';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
const timestamp='1795620000',now=Number(timestamp),body='{"type":1}';
const signature=sign(null,Buffer.from(timestamp+body),privateKey).toString('hex');
const valid={publicKey:pub,signature,timestamp,body,now};
test('accepts valid signed interaction',()=>assert.equal(verifyInteraction(valid),true));
test('rejects tampered, malformed and expired requests',()=>{
  for(const invalid of [{body:'{}'},{signature:'zz'},{publicKey:'bad'},{timestamp:'bad'},{now:now+301},{now:now-301},{body:'a'.repeat(MAX_BODY+1)}])
    assert.equal(verifyInteraction({...valid,...invalid}),false);
});
