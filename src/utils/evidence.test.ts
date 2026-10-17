import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {decodeEvidence} from './evidence';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bytes=(b:Buffer)=>new Uint8Array(b).buffer;
test('Evidence verifies gzip files and HTTP transparently decoded bodies against distinct trusted hashes',async()=>{
 const record={run_id:'fixture-only',rows:[{actual:1.81,predicted:1.44}]};const raw=Buffer.from(JSON.stringify(record)),gzip=gzipSync(raw);
 assert.deepEqual(await decodeEvidence(bytes(gzip),hash(gzip),true,hash(raw)),record);
 assert.deepEqual(await decodeEvidence(bytes(raw),hash(gzip),true,hash(raw)),record);
 await assert.rejects(decodeEvidence(bytes(raw),hash(gzip),true,'0'.repeat(64)),/manifiesto/);
 await assert.rejects(decodeEvidence(bytes(Buffer.from('{}')),hash(gzip),true,hash(raw)),/manifiesto/);
});
