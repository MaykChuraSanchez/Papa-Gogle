"""Causal daily forecasting with temporal selection, calibration and audit blocks.

Only observed targets are scored. Calibration bands are empirical, not a guarantee.
External variables deliberately require publication timestamps before model use.
"""
from functools import lru_cache
import hashlib
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

MODELS = ['Último precio', 'Media 28 días', 'Estacional anual', 'Ridge directo', 'Gradient Boosting directo']
HORIZONS = [7,30,90,180,240]
VERSION = '4.0.0'

def series(frame):
    if frame.variedad.nunique()!=1 or frame.mercado_id.nunique()!=1:
        raise ValueError('Selecciona una sola variedad y mercado')
    x = frame.assign(fecha=pd.to_datetime(frame.fecha)).sort_values('fecha')
    if x.duplicated('fecha').any():
        raise ValueError('Duplicados diarios; no se promedian mercados o fuentes')
    return x.set_index('fecha').precio_s_kg.asfreq('D')

def metrics(y,p):
    mask = np.isfinite(y) & np.isfinite(p)
    if not mask.any():
        raise ValueError('Sin objetivos observados')
    y,p = np.asarray(y)[mask],np.asarray(p)[mask]
    err = y-p
    return {'mae':float(np.abs(err).mean()),'rmse':float(np.sqrt(np.mean(err**2))),
            'smape':float(np.mean(200*np.abs(err)/np.maximum(np.abs(y)+np.abs(p),.01))),
            'n':len(y)}

def causal_values(y):
    # No interpolation, no backfill and no artificial labels for validation.
    return y.ffill(limit=7).to_numpy(float)

def design(values, dates, anchors, leads):
    anchors,leads = np.asarray(anchors,int),np.asarray(leads,int)
    targets=anchors+leads
    doy=pd.DatetimeIndex(dates[0]+pd.to_timedelta(targets,unit='D')).dayofyear.to_numpy()
    dow=pd.DatetimeIndex(dates[0]+pd.to_timedelta(targets,unit='D')).dayofweek.to_numpy()
    s=pd.Series(values)
    mean7=s.rolling(7,min_periods=5).mean().to_numpy()
    mean28=s.rolling(28,min_periods=20).mean().to_numpy()
    std28=s.rolling(28,min_periods=20).std().to_numpy()
    return np.column_stack([values[anchors],mean7[anchors],mean28[anchors],std28[anchors],
                            values[targets-365],leads/240,
                            np.sin(2*np.pi*doy/365.25),np.cos(2*np.pi*doy/365.25),
                            np.sin(4*np.pi*doy/365.25),np.cos(4*np.pi*doy/365.25),
                            np.sin(2*np.pi*dow/7),np.cos(2*np.pi*dow/7)])

def predict(name,y,h):
    if not 1<=h<=240 or len(y)<730 or not np.isfinite(y.iloc[-1]):
        raise ValueError('Se requieren dos años y última observación real; horizonte 1–240 días')
    values=causal_values(y)
    if name=='Último precio':
        return np.repeat(values[-1],h)
    if name=='Media 28 días':
        return np.repeat(np.nanmean(values[-28:]),h)
    if name=='Estacional anual':
        return values[len(y)+np.arange(h)-365]
    if name not in MODELS:
        raise ValueError('Modelo no reconocido')
    xs,ys=[],[]
    observed=y.to_numpy(float)
    for lead in [1,7,14,30,60,90,120,180,240]:
        anchors=np.arange(max(365,len(y)-1460),len(y)-lead,7)
        x=design(values,y.index,anchors,np.repeat(lead,len(anchors)))
        label=observed[anchors+lead]
        valid=np.isfinite(x).all(axis=1)&np.isfinite(label)
        xs.append(x[valid]);ys.append(label[valid])
    model=(make_pipeline(StandardScaler(),Ridge(alpha=40)) if name=='Ridge directo' else
           HistGradientBoostingRegressor(max_iter=70,max_leaf_nodes=12,min_samples_leaf=25,
                                         l2_regularization=3,random_state=42))
    model.fit(np.concatenate(xs),np.concatenate(ys))
    leads=np.arange(1,h+1)
    x=design(values,y.index,np.repeat(len(y)-1,h),leads)
    if not np.isfinite(x).all():
        raise ValueError('Huecos en variables de predicción')
    return np.maximum(.01,model.predict(x))

def evaluate(y,h,models=MODELS):
    """3 selection + 3 calibration + 2 latest audit origins, nonoverlapping per h."""
    cuts=[len(y)-h*i for i in range(8,0,-1)]
    if min(cuts)<730:
        raise ValueError(f'Faltan datos para evaluar horizonte {h} (mínimo {730+8*h} días)')
    results={name:[] for name in models}
    failures=[]
    for cut in cuts:
        train=y.iloc[:cut]
        # A missing origin must not be replaced with later truth.
        for name in models:
            try:
                p=predict(name,train,h)
                target=y.iloc[cut:cut+h].to_numpy(float)
                mask=np.isfinite(target)&np.isfinite(p)
                if mask.sum()<h*.8:
                    raise ValueError('Menos de 80% de objetivos observados')
                results[name].append((cut,target,p,mask))
            except Exception as exc:
                failures.append({'model':name,'origin':str(y.index[cut-1].date()),'error':str(exc)})
    eligible={n:v for n,v in results.items() if len(v)==8}
    if 'Último precio' not in eligible:
        raise ValueError('No se pudo evaluar el baseline en todos los orígenes')
    leaderboard=[]
    for name,folds in eligible.items():
        actual=np.concatenate([f[1] for f in folds[:3]])
        pred=np.concatenate([f[2] for f in folds[:3]])
        leaderboard.append({'model':name,**metrics(actual,pred)})
    leaderboard.sort(key=lambda x:x['mae'])
    winner=leaderboard[0]['model']
    folds=eligible[winner]
    errors=np.concatenate([np.abs(t-p)[m] for _,t,p,m in folds[3:6]])
    # Finite-sample corrected empirical absolute error quantile, pooled over horizon.
    q=min(1,math.ceil((len(errors)+1)*.8)/len(errors))
    width=float(np.quantile(errors,q,method='higher'))
    audit_y=np.concatenate([f[1] for f in folds[6:]])
    audit_p=np.concatenate([f[2] for f in folds[6:]])
    valid=np.isfinite(audit_y)&np.isfinite(audit_p)
    audit=metrics(audit_y,audit_p)
    audit['coverage80']=float(np.mean(np.abs(audit_y[valid]-audit_p[valid])<=width))
    baseline=metrics(audit_y,np.concatenate([f[2] for f in eligible['Último precio'][6:]]))
    skill=1-audit['mae']/baseline['mae'] if baseline['mae']>1e-9 else 0.
    return {'horizon':h,'model':winner,'selection':leaderboard,'audit':audit,
            'baseline_audit':baseline,'skill':skill,'band_width':width,
            'band_method':'Error absoluto empírico 80%, calibrado en tres bloques previos; cobertura no garantizada',
            'status':'experimental' if skill<0 or audit['coverage80']<.75 else 'evaluado',
            'origins':[str(y.index[c-1].date()) for c in cuts],
            'selection_folds':3,'calibration_folds':3,'audit_folds':2,'failures':failures}

def train_series(frame, horizons=HORIZONS, models=MODELS):
    y=series(frame)
    if y.notna().mean()<.85 or not np.isfinite(y.iloc[-1]):
        raise ValueError('Cobertura inferior al 85% o último precio ausente')
    reports=[]
    for h in horizons:
        reports.append(evaluate(y,h,models))
    predictions={name:predict(name,y,max(horizons)) for name in {r['model'] for r in reports}}
    curve=[]
    for lead in range(1,max(horizons)+1):
        report=next(r for r in reports if r['horizon']>=lead)
        p=float(predictions[report['model']][lead-1])
        curve.append({'date':str((y.index[-1]+pd.Timedelta(days=lead)).date()),'lead':lead,
                      'price':round(p,4),'low':round(max(.01,p-report['band_width']),4),
                      'high':round(p+report['band_width'],4),'model':report['model'],
                      'evaluated_horizon':report['horizon'],'status':report['status']})
    observed=y.dropna()
    return {'variety':str(frame.variedad.iloc[0]),'market':str(frame.mercado.iloc[0]),
            'market_id':str(frame.mercado_id.iloc[0]),'level':'mayorista',
            'start':str(y.index.min().date()),'last_date':str(y.index.max().date()),
            'last_price':float(observed.iloc[-1]),'observations':int(y.notna().sum()),
            'coverage':round(float(y.notna().mean()),4),'evaluations':reports,'forecast':curve,
            'history':[{'date':str(d.date()),'price':float(v)} for d,v in observed.items()],
            'data_hash':hashlib.sha256(y.to_csv().encode()).hexdigest(),'model_version':VERSION}
