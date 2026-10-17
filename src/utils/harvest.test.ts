import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateHarvest} from './harvest';
const valid=()=>({schema_version:'6.0.0',variety:'Única',history_hash:'abc',run_id:'run',horizon:7,target:'endpoint',rows:[{selection_scores:{Naive:1}}],policy:{n:1},baseline:{n:1},current:{point:1.5,path:Array.from({length:7},()=>({price:1.5}))}});
test('harvest evidence binds variety, history, run and target',()=>{
 const value=valid();assert.equal(validateHarvest(value,'Única','abc','run',7,'endpoint'),value);
 for(const args of [['Amarilla','abc','run',7,'endpoint'],['Única','other','run',7,'endpoint'],['Única','abc','old',7,'endpoint'],['Única','abc','run',30,'endpoint'],['Única','abc','run',7,'harvest_mean']] as const){assert.throws(()=>validateHarvest(value,args[0],args[1],args[2],args[3],args[4]));}
});
test('harvest evidence refuses misaligned audit or invalid curves',()=>{
 const value=valid();value.baseline.n=2;assert.throws(()=>validateHarvest(value,'Única','abc','run',7,'endpoint'));
 const bad=valid();bad.current.path[0].price=NaN;assert.throws(()=>validateHarvest(bad,'Única','abc','run',7,'endpoint'));
});
