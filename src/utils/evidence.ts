/** HTTP clients may decode Content-Encoding:gzip before returning the body. */
export async function decodeEvidence(body:ArrayBuffer,checksum?:string,compressed=false,contentChecksum?:string){
 const digest=await crypto.subtle.digest('SHA-256',body);
 const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const wireVerified=!checksum||actual===checksum;
 const decodedVerified=compressed&&!!contentChecksum&&actual===contentChecksum;
 if(!wireVerified&&!decodedVerified)throw Error('La evidencia no coincide con su manifiesto.');
 if(compressed&&!decodedVerified){
  if(typeof DecompressionStream==='undefined')throw Error('Este navegador no puede abrir la auditoría comprimida. Descárgala desde su ficha o utiliza un navegador actualizado.');
  return new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 }
 return JSON.parse(new TextDecoder().decode(body));
}
