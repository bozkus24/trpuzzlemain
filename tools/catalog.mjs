import {gzipSync} from 'node:zlib';
// Local maintenance of the encrypted catalog. Never writes decrypted data to dist.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createCipheriv} from 'node:crypto';
import {serverKey,decryptCatalog} from '../server/crypto.mjs';
const root=path.resolve(import.meta.dirname,'..'),env=fs.readFileSync(path.join(root,'.env'),'utf8');
const key=serverKey(env.match(/^TRPUZZLE_SERVER_KEY=(.*)$/m)?.[1]);
const file=path.join(root,'server/catalog.enc'),privateFile=path.join(root,'.server-private/catalog.json');
const action=process.argv[2];
if(action==='decrypt'){
  if(fs.existsSync(privateFile))throw new Error('Local catalog already exists; refusing to overwrite edits.');
  fs.mkdirSync(path.dirname(privateFile),{recursive:true,mode:0o700});
  fs.writeFileSync(privateFile,JSON.stringify(decryptCatalog(fs.readFileSync(file),key),null,2),{mode:0o600});
  console.log('Decrypted catalog saved only in ignored .server-private/catalog.json.');
}else if(action==='encrypt'){
  const data=JSON.parse(fs.readFileSync(privateFile,'utf8'));
  if(data.version!==1||!['harfle','harf500','baklava','bagla','kesme','tilkile','arala','sehirle'].every(g=>data[g]))throw new Error('Invalid catalog');
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from('trpuzzle-catalog-v1'));
  const body=Buffer.concat([c.update(gzipSync(JSON.stringify(data))),c.final()]);
  fs.writeFileSync(file,Buffer.concat([iv,c.getAuthTag(),body]));
  console.log('Encrypted catalog updated. No deployment performed.');
}else throw new Error('Usage: node tools/catalog.mjs decrypt|encrypt');
