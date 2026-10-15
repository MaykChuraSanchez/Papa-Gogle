"""Context, not automatically predictive features. Preserve source and period."""
from hashlib import sha256
from pathlib import Path
import json
import re
import warnings
import numpy as np
import pandas as pd
import requests
from .storage import DATA, ROOT, atomic_json, now, read, replace

BCRP='https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN01210PM/json/2019-1/{end}/ing'

def macro(offline=False):
    path=DATA/'context'/'macro.json'
    try:
        if offline:
            return json.loads(path.read_text(encoding='utf-8'))
        url=BCRP.format(end=f'{now():%Y-%m}')
        response=requests.get(url,timeout=(10,40))
        response.raise_for_status()
        js=response.json()
        description=js['config']['series'][0]['name']
        rows=[]
        for p in js['periods']:
            try:
                value=float(p['values'][0])
                day=pd.to_datetime(p['name'],format='%b.%Y')
                if np.isfinite(value):
                    rows.append({'period':str(day.date()),'value':value})
            except (ValueError,TypeError,IndexError):
                continue
        if len(rows)<24:
            raise ValueError('BCRP no devolvió 24 meses válidos')
        raw=DATA/'bronze'/'bcrp'/f'{sha256(response.content).hexdigest()[:16]}.json'
        raw.parent.mkdir(parents=True,exist_ok=True)
        raw.write_bytes(response.content)
        result={'code':'PN01210PM','description':description,'url':url,'retrieved_at':now().isoformat(),
                'rows':rows,'model_use':False,'note':'Serie revisable; sin historial de publicaciones. Correlación exploratoria de cambios mensuales, sin causalidad.'}
        atomic_json(path,result)
        return result
    except Exception as exc:
        if path.exists():
            result=json.loads(path.read_text(encoding='utf-8')); result['refresh_error']=str(exc)
            return result
        return {'rows':[],'error':str(exc),'model_use':False}

def correlations(prices,context):
    if not context.get('rows'):
        return []
    m=pd.DataFrame(context['rows']).assign(period=lambda x:pd.to_datetime(x.period)).set_index('period').value
    outputs=[]
    for variety,frame in prices.groupby('variedad'):
        p=frame.set_index('fecha').precio_s_kg.resample('MS').mean()
        # Drop incomplete current month; do not accidentally join across missing months.
        p=p[p.index<pd.Timestamp(now().date()).replace(day=1)]
        base=pd.concat([p.rename('price'),m.rename('macro')],axis=1).asfreq('MS')
        changes=np.log(base).diff()
        for lag in [1,2,3]:
            pair=pd.concat([changes.price,changes.macro.shift(lag)],axis=1).dropna()
            if len(pair)>=24:
                corr=pair.iloc[:,0].corr(pair.iloc[:,1])
                if np.isfinite(corr):
                    outputs.append({'variety':variety,'lag_months':lag,'correlation':round(float(corr),4),'n':len(pair)})
    return outputs

def regional_snapshot():
    """Explicit adapter for the verified June 2026 C.18 snapshot already in v3.

    New periods must pass title/header checks rather than silently shift columns.
    """
    files=list((ROOT/'data'/'bronze'/'agro_cifras'/'latest').glob('1.-*.xlsx'))
    if not files:
        reference=ROOT/'reference'/'regional_production_2026_06.json'
        if reference.exists():
            result=json.loads(reference.read_text(encoding='utf-8'))
            atomic_json(DATA/'context'/'regional.json',result)
            return result
        return {'regions':[],'state':'unavailable','note':'No hay libro agrícola local'}
    f=files[0]
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',UserWarning)
        d=pd.read_excel(f,sheet_name='c-18',header=None)
    if 'ENERO-JUNIO 2025-2026' not in str(d.iat[0,0]) or d.iat[3,42]!='Papa':
        raise ValueError('Cambió el periodo/cabecera regional; adaptar antes de publicar')
    last=None; totals={}; rows=[]
    for i in range(4,58):
        label,year,value=d.iat[i,38],str(d.iat[i,39]),d.iat[i,42]
        if pd.notna(label):
            last=str(label).strip()
        if year.startswith('2026') and pd.notna(value):
            if last=='Total Nacional':
                total=float(value)
            else:
                rows.append({'region':last,'production_t':round(float(value),3),'cell':f'AQ{i+1}'})
    # Workbook includes Lima Metropolitana and Lima separately: keep source granularity.
    if not rows or abs(sum(x['production_t'] for x in rows)-total)>1:
        raise ValueError('Producción regional no reconcilia con el total nacional')
    result={'period':'enero–junio 2026','preliminary':True,'unit':'toneladas','regions':rows,
            'total_t':total,'sheet':'c-18','file':f.name,'sha256':sha256(f.read_bytes()).hexdigest(),
            'source_url':'https://www.gob.pe/institucion/midagri/informes-publicaciones/7910469-boletin-estadistico-mensual-el-agro-en-cifras-2026',
            'note':'Producción histórica preliminar; no es precio regional ni pronóstico. Snapshot del libro conservado en v3.'}
    atomic_json(DATA/'context'/'regional.json',result)
    return result

def main():
    m=macro()
    print('BCRP',len(m['rows']),m.get('description',m.get('error')))
    atomic_json(DATA/'context'/'correlations.json',correlations(read('prices'),m))
    try:
        r=regional_snapshot();print('Regional',len(r['regions']))
    except Exception as exc:
        print('Regional ERROR',exc)

if __name__=='__main__':
    main()
