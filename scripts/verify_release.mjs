import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {gunzipSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'..'),pub=resolve(root,'public');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const fail=message=>{throw Error('Publicación rechazada: '+message);};
function file(url){if(typeof url!=='string'||!url.startsWith('/')||url.includes('..'))fail('ruta inválida');const path=resolve(pub,'.'+url);if(!path.startsWith(pub))fail('ruta fuera de public');return path;}
const release=read(resolve(pub,'release.json'));
if(release.schema_version!=='5.0.0')fail('schema incompatible');
for(const section of ['operational','advanced','research','climate']){const ref=release[section];if(hash(ref.normalization==='LF'?readFileSync(file(ref.url),'utf8').replaceAll('\r\n','\n'):readFileSync(file(ref.url)))!==ref.sha256)fail(section+' cambió después del sellado');}
const core=read(file(release.operational.url));const research=read(file(release.research.url));
if(research.run_id!==release.research_run_id||research.series.length!==10)fail('run o catálogo incompatible');
for(const row of research.series){const main=core.series.find(s=>s.variety===row.variety);if(!main)fail('variedad desconocida');const data=read(resolve(pub,'data',main.file));if(data.data_hash!==row.history_hash)fail('historia antigua para '+row.variety);}
const checked=new Set();
function checkAsset(name,expectedContentHash,expected={}){
 if(checked.has(name))return;checked.add(name);
 if(!/^[a-f0-9]{64}\.json(?:\.gz)?$/.test(name))fail('nombre de evidencia inválido');
 const bytes=readFileSync(resolve(pub,'research-v5',name));if(hash(bytes)!==name.slice(0,64))fail('checksum de '+name);
 const content=name.endsWith('.gz')?gunzipSync(bytes):bytes;
 if(expectedContentHash&&hash(content)!==expectedContentHash)fail('checksum del contenido descomprimido');
 const object=JSON.parse(content.toString('utf8'));if(object.run_id!==research.run_id)fail('mezcla de ejecuciones');
 for(const [key,value]of Object.entries(expected))if(object[key]!==value)fail('metadatos de evidencia incompatibles: '+key);
 if(object.details_by_horizon)for(const [h,file]of Object.entries(object.details_by_horizon))checkAsset(file,undefined,{variety:object.variety,horizon:Number(h)});
 if(object.audit_file){if(!/^[a-f0-9]{64}$/.test(object.audit_content_sha256))fail('falta checksum de contenido auditoría');checkAsset(object.audit_file,object.audit_content_sha256,{variety:object.variety,horizon:object.horizon});}
}

research.series.forEach(s=>checkAsset(s.file,undefined,{variety:s.variety}));
if(release.harvest){
 const ref=release.harvest,bytes=readFileSync(file(ref.url));if(hash(bytes)!==ref.sha256)fail('evidencia cosecha cambió después del sellado');
 const catalog=JSON.parse(bytes);if(catalog.run_id!==release.harvest_run_id||catalog.series.length!==10)fail('catálogo cosecha incompatible');
 const checkedHarvest=new Set();
 function checkHarvest(name,expected){
  if(!/^[a-f0-9]{64}\.json$/.test(name))fail('ruta cosecha inválida');
  const raw=readFileSync(resolve(pub,'harvest-v6',name));if(hash(raw)!==name.slice(0,64))fail('checksum cosecha');
  const data=JSON.parse(raw);for(const [k,v]of Object.entries(expected))if(data[k]!==v)fail('metadatos cosecha incompatibles');
  if(data.run_id!==catalog.run_id)fail('mezcla de ejecuciones cosecha');
  checkedHarvest.add(name);
  if(data.details)for(const [key,value]of Object.entries(data.details)){const [h,...parts]=key.split('-');checkHarvest(value,{...expected,horizon:Number(h),target:parts.join('-')});}
 }
 for(const s of catalog.series){const main=core.series.find(r=>r.variety===s.variety);if(!main||read(resolve(pub,'data',main.file)).data_hash!==s.history_hash)fail('historia cosecha antigua');checkHarvest(s.file,{variety:s.variety,history_hash:s.history_hash});}
 const digest=createHash('sha256');
 for(const name of readdirSync(resolve(root,'agrodecide/research_v6')).filter(n=>n.endsWith('.py')).sort()){digest.update(name);digest.update(readFileSync(resolve(root,'agrodecide/research_v6',name),'utf8').replaceAll('\r\n','\n'));}
 digest.update('PROTOCOLO_V6.md');digest.update(readFileSync(resolve(root,'docs/modelos/PROTOCOLO_V6.md'),'utf8').replaceAll('\r\n','\n'));
 digest.update('models.py');digest.update(readFileSync(resolve(root,'agrodecide/research_v5/models.py'),'utf8').replaceAll('\r\n','\n'));
 if(digest.digest('hex')!==catalog.code_hash)fail('código cosecha distinto del evaluado');
 console.log(JSON.stringify({harvest_run_id:catalog.run_id,harvest_assets_verified:checkedHarvest.size}));
}
const modelCode=createHash('sha256');
for(const name of readdirSync(resolve(root,'agrodecide/research_v5')).filter(n=>n.endsWith('.py')).sort()){modelCode.update(name);modelCode.update(readFileSync(resolve(root,'agrodecide/research_v5',name)));}
if(modelCode.digest('hex')!==research.code_hash)fail('código de investigación distinto del evaluado');
const paths=[];function walk(dir){for(const name of readdirSync(dir)){const p=resolve(dir,name);if(statSync(p).isDirectory()){if(name!=='__pycache__')walk(p);}else if(['.py','.ts','.tsx','.css','.mjs'].includes(extname(p)))paths.push(p);}}
['src','api','server','agrodecide','scripts'].forEach(dir=>walk(resolve(root,dir)));
['package.json','package-lock.json','vercel.json','vite.config.ts','requirements-v4.txt','requirements-v5.txt','.gitattributes'].forEach(p=>paths.push(resolve(root,p)));
const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
function sourceBytes(p){return Buffer.from(p===resolve(root,'vercel.json')?JSON.stringify(ordered(read(p))):readFileSync(p,'utf8').replaceAll('\r\n','\n'));}
const code=createHash('sha256');const pairs=[...new Set(paths)].map(p=>[relative(root,p).replaceAll('\\','/'),p]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
for(const [name,p]of pairs){code.update(name+'\0');code.update(sourceBytes(p));code.update('\0');}
const actualCode=code.digest('hex');
if(actualCode!==release.source_tree_sha256){const current=Object.fromEntries(pairs.map(([name,p])=>[name,hash(sourceBytes(p))]));const names=new Set([...Object.keys(current),...Object.keys(release.source_files||{})]);const changed=[...names].filter(name=>current[name]!==release.source_files?.[name]);console.error(JSON.stringify({expected:release.source_tree_sha256,actual:actualCode,changed_files:changed,config_keys_changed:changed.includes('vercel.json')?[...new Set([...Object.keys(read(resolve(root,'vercel.json'))),...Object.keys(release.source_config||{})])].filter(k=>JSON.stringify(ordered(read(resolve(root,'vercel.json'))[k]))!==JSON.stringify(ordered(release.source_config?.[k]))):[]}));fail('el código cambió; vuelve a ejecutar npm run release:seal');}
writeFileSync(resolve(pub,'deployment.json'),JSON.stringify({build_id:release.build_id,source_commit:process.env.VERCEL_GIT_COMMIT_SHA||null,environment:process.env.VERCEL_ENV||'local',built_at:new Date().toISOString()})+'\n');
console.log(JSON.stringify({build_id:release.build_id,research_run_id:research.run_id,assets_verified:checked.size,data_as_of:release.data_as_of}));
