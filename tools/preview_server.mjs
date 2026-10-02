// Local-only preview of all built games plus the answer API. Never proxies live sites.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {serverKey,decryptCatalog} from '../server/crypto.mjs';
import {createService,httpHandler} from '../server/service.mjs';
const root=path.resolve(import.meta.dirname,'..'),parent=path.dirname(root);
for(const line of fs.readFileSync(path.join(root,'.env'),'utf8').split('\n')){const m=line.match(/^(TRPUZZLE_SERVER_(?:KEY|START))=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}
const key=serverKey(),data=decryptCatalog(fs.readFileSync(path.join(root,'server/catalog.enc')),key);
const fixture=process.env.TRPUZZLE_PREVIEW_DATE;
if(fixture&&!/^2026-\d{2}-\d{2}$/.test(fixture))throw new Error('Invalid local fixture date');
const service=createService({data,key,cutover:process.env.TRPUZZLE_SERVER_START,...(fixture?{clock:()=>new Date(fixture+'T12:00:00Z')}:{})});
const routes={harfle:'harfle',harf500:'word500turkce',baklava:'trpuzzle4',bagla:'trpuzzle1',kesme:'trpuzzle2',tilkile:'trpuzzle6',arala:'arala',sehirle:'trpuzzle3'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:'+server.address().port);
    if(url.pathname==='/api/game'){
      const options={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){options.body=Readable.toWeb(req);options.duplex='half';}
      const response=await httpHandler(new Request(url,options),service);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const parts=decodeURIComponent(url.pathname).split('/').filter(Boolean),repo=routes[parts[0]];
    const base=path.join(repo?path.join(parent,repo):root,'dist'),rel=repo?parts.slice(1).join('/'):parts.join('/');
    let file=path.resolve(base,rel||'index.html');if(!file.startsWith(base+path.sep))throw 0;
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)||!fs.realpathSync(file).startsWith(base+path.sep))throw 0;
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});let content=fs.readFileSync(file);
    if(fixture&&path.extname(file)==='.html'){const time=Date.parse(fixture+'T12:00:00Z');content=Buffer.from(content.toString().replace('<head>','<head><script>/* Local test clock, never published. */{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a: ['+time+']))}static now(){return '+time+'}}}</script>'));}
    res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||8099),'127.0.0.1',()=>console.log('Local server preview: http://127.0.0.1:'+server.address().port+'/'));
