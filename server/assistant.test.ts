import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/assistant.ts';
import {contextFor} from './grounding.ts';
function response(){return {statusCode:0,headers:{} as Record<string,string>,data:null as any,setHeader(key:string,v:string){this.headers[key]=v;},end(text:string){this.data=JSON.parse(text);}};}
test('Grounding resolves the variety in the question and never trusts a filename',async()=>{const result=await contextFor({question:'Precio de papa Amarilla',variety:'../../.env'});assert.equal(result.facts.variety,'Amarilla');assert.equal(result.facts.market_id,'15011501');assert.ok(result.local.includes('mayorista'));});
test('Grounding rejects empty or oversized questions',async()=>{await assert.rejects(()=>contextFor({question:''}));await assert.rejects(()=>contextFor({question:'a'.repeat(1501)}));});
test('API reports local mode honestly without credentials',async()=>{const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,200);assert.equal(res.data.configured,false);assert.equal(res.data.provider,'local');}finally{if(key)process.env.OPENAI_API_KEY=key;}});
test('Cross-origin queries and unsupported methods are rejected',async()=>{let res=response();await handler({method:'POST',headers:{origin:'https://unrelated.example','x-forwarded-for':'test-a'},body:{question:'Precio de papa'}},res);assert.equal(res.statusCode,403);res=response();await handler({method:'DELETE',headers:{}},res);assert.equal(res.statusCode,405);});
test('Configured provider receives trusted facts and secret stays server-side',async()=>{
 const originalFetch=globalThis.fetch,key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL;
 process.env.OPENAI_API_KEY='test-private-key';process.env.OPENAI_MODEL='test-model';
 let sent:any;globalThis.fetch=async(url:any,init:any)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(init.body);return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Respuesta basada en la publicación.'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{const res=response();await handler({method:'POST',headers:{origin:'https://papa-gogle.vercel.app','x-forwarded-for':'test-b'},body:{question:'Precio de papa Canchán',variety:'Canchán'}},res);assert.equal(res.statusCode,200);assert.equal(res.data.provider,'OpenAI');assert.equal(sent.store,false);assert.ok(sent.instructions.includes('CONTEXTO VERIFICADO'));assert.ok(sent.instructions.includes('15011501'));assert.equal(JSON.stringify(res.data).includes('test-private-key'),false);}
 finally{globalThis.fetch=originalFetch;if(key)process.env.OPENAI_API_KEY=key;else delete process.env.OPENAI_API_KEY;if(model)process.env.OPENAI_MODEL=model;else delete process.env.OPENAI_MODEL;}
});
