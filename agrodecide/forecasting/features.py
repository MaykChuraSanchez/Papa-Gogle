"""Features at origin, not at target. No future observed covariates are used."""
import json
import numpy as np
import pandas as pd
from agrodecide.v4.storage import DATA, read
from .data import asof_series

ALERTS=['no activo','alerta de el nino costero','alerta de la nina costera','vigilancia de el nino costero','vigilancia de la nina costera']
METHODS=['ENFEN 01-2015','ENFEN 02-2024','ENFEN 02-2026']

def canonical_alert(value):
    return {'alerta de el nino':'alerta de el nino costero','vigilancia de el nino':'vigilancia de el nino costero','inactivo':'no activo'}.get(value,value)

def prices(y):
    filled=y.ffill(limit=7)
    f=pd.DataFrame(index=y.index)
    for lag in [1,2,3,7,14,30,60,365]:f[f'precio_lag_{lag}']=filled.shift(lag-1)
    for window in [7,14,30,60]:
        r=filled.rolling(window,min_periods=max(3,int(window*.8)))
        f[f'precio_media_{window}']=r.mean();f[f'precio_mediana_{window}']=r.median();f[f'precio_std_{window}']=r.std()
    for lag in [1,7,30]:f[f'precio_variacion_{lag}']=filled.pct_change(lag,fill_method=None)
    f['precio_tendencia_7']=(filled-filled.shift(7))/7
    return f.replace([np.inf,-np.inf],np.nan)

def alert_features(dates, records):
    outputs=pd.DataFrame(index=dates)
    history=pd.DataFrame(records)
    if not history.empty:
        if 'vintage_eligible' in history:history=history[history.vintage_eligible.eq(True)].copy()
    if not history.empty:
        history['released']=pd.to_datetime(history.fecha_disponibilidad)
        if 'fecha_publicacion' in history:
            history['issue']=pd.to_datetime(history.fecha_publicacion)
            history=history.sort_values(['released','issue']).drop_duplicates('released',keep='last')
        else:history=history.sort_values('released').drop_duplicates('released',keep='last')
        # A delayed copy/revision of an old bulletin cannot supersede a newer
        # bulletin merely because it was uploaded later.
        if 'fecha_publicacion' in history:
            history=history[history.issue==history.issue.cummax()]
    for lag in [0,1,2,3,6]:
        if history.empty:
            known=pd.Series(False,index=dates);states=pd.Series('',index=dates);methods=states
        else:
            query=pd.DataFrame({'query':dates-pd.DateOffset(months=lag),'position':np.arange(len(dates))})
            joined=pd.merge_asof(query.sort_values('query'),history,left_on='query',right_on='released',direction='backward').sort_values('position')
            known=pd.Series((joined.released.notna()&((joined['query']-joined.released).dt.days<=100)).to_numpy(),index=dates)
            states=pd.Series(joined.clasificacion.map(canonical_alert).to_numpy(),index=dates)
            methods=pd.Series(joined.version_metodologica.to_numpy(),index=dates)
        outputs[f'enfen_conocido_lag{lag}']=known.astype(float)
        for version,method in enumerate(METHODS):
            for n,state in enumerate(ALERTS):
                outputs[f'enfen_v{version}_lag{lag}_s{n}']=np.where(known,((methods==method)&(states==state)).astype(float),np.nan)
    return outputs

def external(frame,y,records):
    x=pd.DataFrame(index=y.index)
    volume=frame.set_index('fecha').volumen_t.reindex(y.index)
    # Observation-date research only: release timestamps are unknown for SISAP volume.
    for lag in [1,7,14,30,60,90]:x[f'oferta_volumen_lag_{lag}']=volume.shift(lag)
    for window in [7,30]:
        s=volume.shift(1).rolling(window,min_periods=max(3,int(window*.7)))
        x[f'oferta_media_{window}']=s.mean();x[f'oferta_acumulado_{window}']=s.sum()
    x=x.join(alert_features(y.index,records))
    imported=read('external_vintages')
    if not imported.empty:
        for col,value in [('producto','Papa'),('variedad',frame.variedad.iloc[0]),('mercado_id',frame.mercado_id.iloc[0])]:
            if col in imported:imported=imported[imported[col].isna()|imported[col].eq(value)]
        for (variable,method,region),part in imported.groupby(['variable','metodologia','region'],dropna=False):
            name=variable.lower()
            family=('enfen_indice' if any(t in name for t in ['icen','roni','oni','nino','tsm']) else
                    'oferta_verificada' if 'volumen' in name else
                    'oferta_agricola' if any(t in name for t in ['produccion','superficie','rendimiento']) else
                    'clima' if any(t in name for t in ['lluvia','precipit','temperatura','helada']) else 'macro')
            prefix=f'{family}_{variable}_{method}_{region}'
            for lag in ([1,7,14,30,60,90] if family=='oferta_verificada' else [1,2,3,6]):
                # Shift the query date, not a revised table retrospectively.
                query=y.index-(pd.Timedelta(days=lag) if family=='oferta_verificada' else pd.DateOffset(months=lag))
                x[prefix+f'_lag_{lag}']=asof_series(part,variable,query,methodology=method).to_numpy()
    return x

def build(frame,y,records):return prices(y).join(external(frame,y,records))

def columns(features,configuration):
    selected=[c for c in features if c.startswith('precio_')]
    if configuration in {'B','C','D','E','B+ENFEN'}:
        verified=[c for c in features if c.startswith('oferta_verificada_') and features[c].notna().mean()>=.6]
        selected += verified+[c for c in features if c.startswith('oferta_agricola_')] if verified else [c for c in features if c.startswith('oferta_')]
    if configuration in {'C','D','E'}:selected += [c for c in features if c.startswith('macro_')]
    if configuration in {'D','E'}:selected += [c for c in features if c.startswith('clima_')]
    if configuration in {'E','A+ENFEN','B+ENFEN'}:selected += [c for c in features if c.startswith('enfen_')]
    return selected

def design(features,anchors,leads,configuration):
    selected=columns(features,configuration)
    a=np.asarray(anchors,int);lead=np.asarray(leads,int)
    x=features.iloc[a][selected].to_numpy(float)
    targets=features.index[a]+pd.to_timedelta(lead,unit='D')
    doy=targets.dayofyear.to_numpy();dow=targets.dayofweek.to_numpy()
    calendar=np.column_stack([lead,np.sin(2*np.pi*doy/365.25),np.cos(2*np.pi*doy/365.25),np.sin(2*np.pi*dow/7),np.cos(2*np.pi*dow/7)])
    return np.column_stack([x,calendar]),selected+['plazo_dias','mes_sin','mes_cos','semana_sin','semana_cos']

def load_alerts():
    path=DATA/'forecasting'/'sources'/'enfen.json'
    return json.loads(path.read_text(encoding='utf-8'))['rows'] if path.exists() else []
