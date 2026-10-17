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
const modelCode=createHash('sha256');
for(const name of readdirSync(resolve(root,'agrodecide/research_v5')).filter(n=>n.endsWith('.py')).sort()){modelCode.update(name);modelCode.update(readFileSync(resolve(root,'agrodecide/research_v5',name)));}
if(modelCode.digest('hex')!==research.code_hash)fail('código de investigación distinto del evaluado');
const paths=[];function walk(dir){for(const name of readdirSync(dir)){const p=resolve(dir,name);if(statSync(p).isDirectory()){if(name!=='__pycache__')walk(p);}else if(['.py','.ts','.tsx','.css','.mjs'].includes(extname(p)))paths.push(p);}}
['src','api','server','agrodecide','scripts'].forEach(dir=>walk(resolve(root,dir)));
['package.json','package-lock.json','vercel.json','vite.config.ts','requirements-v4.txt','requirements-v5.txt','.gitattributes'].forEach(p=>paths.push(resolve(root,p)));
const code=createHash('sha256');const pairs=[...new Set(paths)].map(p=>[relative(root,p).replaceAll('\\','/'),p]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
for(const [name,p]of pairs){code.update(name+'\0');code.update(readFileSync(p,'utf8').replaceAll('\r\n','\n'));code.update('\0');}
if(code.digest('hex')!==release.source_tree_sha256)fail('el código cambió; vuelve a ejecutar npm run release:seal');
writeFileSync(resolve(pub,'deployment.json'),JSON.stringify({build_id:release.build_id,source_commit:process.env.VERCEL_GIT_COMMIT_SHA||null,environment:process.env.VERCEL_ENV||'local',built_at:new Date().toISOString()})+'\n');
console.log(JSON.stringify({build_id:release.build_id,research_run_id:research.run_id,assets_verified:checked.size,data_as_of:release.data_as_of}));
