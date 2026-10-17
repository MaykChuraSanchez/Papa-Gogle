"""Purged temporal phases and conservative block-aware challenger promotion."""
import math
import numpy as np
import pandas as pd
from .models import MODELS, predict

HORIZONS = (7,15,30,90,180,240)


def plan(y, horizon, sealed_days=240):
    sealed_start = y.index[-1]-pd.Timedelta(days=sealed_days-1)
    candidates = [d for d in pd.date_range(y.index[0]+pd.Timedelta(days=730), sealed_start, freq='ME')
                  if d in y.index and np.isfinite(y.loc[d]) and d+pd.Timedelta(days=horizon)<sealed_start
                  and y.loc[d+pd.Timedelta(days=1):d+pd.Timedelta(days=horizon)].notna().sum()>=.8*horizon]
    audit = candidates[-12:]
    if len(audit)!=12:
        raise ValueError('Se requieren 12 orígenes de auditoría antes del tramo sellado')
    previous = [d for d in candidates if d+pd.Timedelta(days=horizon)<audit[0]]
    calibration = previous[-6:]
    if len(calibration)!=6:
        raise ValueError('Se requieren 6 orígenes de calibración purgados')
    previous = [d for d in previous if d+pd.Timedelta(days=horizon)<calibration[0]]
    selection = previous[-6:]
    if len(selection)!=6:
        raise ValueError('Se requieren 6 orígenes de selección purgados')
    return {'selection':selection, 'calibration':calibration, 'audit':audit,
            'sealed_start':sealed_start, 'sealed_end':y.index[-1]}


def metrics(rows, objective='path'):
    selected = [r for r in rows if objective!='endpoint' or r['lead']==r['horizon']]
    if not selected:
        return None
    a=np.asarray([r['actual'] for r in selected]);p=np.asarray([r['predicted'] for r in selected]);e=p-a
    scale=np.asarray([r['scale'] for r in selected]);good=scale>0
    return {'mae':float(np.abs(e).mean()), 'rmse':float(np.sqrt(np.mean(e*e))),
            'bias':float(e.mean()), 'wape':float(100*np.abs(e).sum()/np.abs(a).sum()),
            'smape':float(np.mean(200*np.abs(e)/(np.abs(a)+np.abs(p)))),
            'mase':float(np.mean(np.abs(e[good])/scale[good])) if good.any() else None,
            'n':len(selected), 'origins':len(set(r['origin'] for r in selected)),
            'objective':'precio en t+h' if objective=='endpoint' else 'trayectoria diaria t+1…t+h'}


def rows_for(y, origin, horizon, predicted):
    train=y.loc[:origin];target=y.loc[origin+pd.Timedelta(days=1):origin+pd.Timedelta(days=horizon)]
    scale=float(train.diff().abs().dropna().mean());rows=[]
    for lead,(date,actual) in enumerate(target.items(),1):
        if np.isfinite(actual):
            rows.append({'origin':str(origin.date()), 'date':str(date.date()), 'lead':lead, 'horizon':horizon,
                         'actual':float(actual), 'predicted':float(predicted[lead-1]),
                         'baseline':float(train.iloc[-1]), 'scale':scale})
    return rows


def block_test(candidate_rows, baseline_rows, horizon, replicates=4999, seed=20261016):
    """Moving circular block bootstrap on paired *origin* MAEs, not daily pseudo-n.

    Block size covers overlapping horizon windows and at least two monthly origins.
    p is the centered one-sided bootstrap tail under null mean improvement=0.
    A minimum of six effective blocks prevents weak long-horizon claims.
    """
    def grouped(rows):
        return {o:np.mean([abs(r['predicted']-r['actual']) for r in rows if r['origin']==o])
                for o in sorted(set(r['origin'] for r in rows))}
    c,b=grouped(candidate_rows),grouped(baseline_rows)
    if list(c)!=list(b):
        raise ValueError('Comparación pareada exige los mismos orígenes')
    origins=list(c);d=np.array([b[o]-c[o] for o in origins]);n=len(d)
    gaps=np.diff(pd.to_datetime(origins).values).astype('timedelta64[D]').astype(int)
    spacing=float(np.median(gaps)) if len(gaps) else 30.
    block=max(2,int(math.ceil(horizon/max(spacing,1))))
    effective=n/block;baseline=float(np.mean(list(b.values())))
    improvement=float(d.mean()/baseline) if baseline>0 else 0.
    rng=np.random.default_rng(seed);starts=rng.integers(0,n,size=(replicates,math.ceil(n/block)))
    ix=(starts[:,:,None]+np.arange(block)[None,None,:])%n;ix=ix.reshape(replicates,-1)[:,:n]
    samples=d[ix].mean(axis=1);ci=np.quantile(samples,[.025,.975])
    centered=(d-d.mean())[ix].mean(axis=1)
    p=float((1+np.count_nonzero(centered>=d.mean()))/(replicates+1))
    # Such a tiny, dependent audit cannot support a robust significance claim.
    power=effective>=6 and n>=12
    return {'origins':n, 'block_length_origins':block, 'effective_blocks_approx':effective,
            'bootstrap_replicates':replicates, 'seed':seed, 'mean_absolute_error_reduction':float(d.mean()),
            'relative_mae_improvement':improvement, 'ci95_absolute_reduction':[float(x) for x in ci],
            'p_one_sided_raw':p, 'sufficient_effective_blocks':power,
            'wins_by_origin':int((d>0).sum()),
            'interpretation':'Exploratorio: pocos bloques independientes' if not power else 'Inferencia pareada dependiente; no garantía futura'}


def holm(p_values):
    pairs=sorted(enumerate(p_values),key=lambda pair:pair[1]);out=[1.]*len(p_values);maximum=0.
    for rank,(index,p) in enumerate(pairs):
        maximum=max(maximum,min(1.,p*(len(pairs)-rank)));out[index]=maximum
    return out


def evaluate(y, horizon):
    phases=plan(y,horizon);reports=[];failures=[];blocks={}
    for model in MODELS:
        results={};metadata={};bad=False
        for phase in ('selection','calibration','audit'):
            rows=[]
            for origin in phases[phase]:
                try:
                    p,meta=predict(model,y.loc[:origin],horizon)
                    rows.extend(rows_for(y,origin,horizon,p));metadata[str(origin.date())]=meta
                except ValueError as exc:
                    failures.append({'model':model,'phase':phase,'origin':str(origin.date()),'reason':str(exc)});bad=True;break
            if bad:break
            results[phase]=rows
        if bad:continue
        blocks[model]=results
        reports.append({'model':model,'selection':metrics(results['selection']),
                        'audit':metrics(results['audit']), 'endpoint_audit':metrics(results['audit'],'endpoint'),
                        'metadata_by_origin':metadata})
    if 'Naive' not in blocks:raise ValueError('Baseline no evaluable; conservar artefacto anterior')
    # Exactly one challenger is selected without looking at audit/calibration losses.
    nonbaseline=[r for r in reports if r['model']!='Naive']
    chosen=min(nonbaseline,key=lambda r:(r['selection']['mae'],r['model'])) if nonbaseline else None
    comparison=block_test(blocks[chosen['model']]['audit'],blocks['Naive']['audit'],horizon) if chosen else None
    for report in reports:
        name=report['model'];errors=np.array([abs(r['predicted']-r['actual']) for r in blocks[name]['calibration']])
        bands={}
        for level in (.8,.95):
            q=min(1,math.ceil((len(errors)+1)*level)/len(errors));width=float(np.quantile(errors,q,method='higher'))
            bands[str(int(level*100))]=width
            report['audit']['coverage'+str(int(level*100))]=float(np.mean([abs(r['predicted']-r['actual'])<=width for r in blocks[name]['audit']]))
        report['bands']=bands
    return {'horizon':horizon,'target':'trayectoria diaria; endpoint reportado por separado',
            'phases':{k:[str(x.date()) for x in phases[k]] for k in ('selection','calibration','audit')},
            'sealed_test':{'start':str(phases['sealed_start'].date()),'end':str(phases['sealed_end'].date()),'scored':False,
                           'limitation':'Reservado para este protocolo, pero historia ya inspeccionada por V2; test prospectivo global pendiente'},
            'selected_challenger':chosen['model'] if chosen else None,'comparison':comparison,
            'candidates':reports,'failures':failures,
            'audit_rows':{name:result['audit'] for name,result in blocks.items()},
            'calibration_origins':6,'audit_origins':12,'selection_origins':6,
            'forecast_paths':{}}


def finish(report,y,adjusted_p,minimum_improvement=.03):
    """Finalize gate only after Holm adjustment across the complete experiment family."""
    comparison=report['comparison']; reasons=[]
    if comparison:
        comparison['p_holm']=adjusted_p
        if comparison['relative_mae_improvement']<minimum_improvement:reasons.append('Mejora MAE inferior al umbral configurable')
        if not comparison['sufficient_effective_blocks']:reasons.append('Menos de 6 bloques efectivos aproximados')
        if adjusted_p>.05:reasons.append('Sin evidencia tras corrección Holm por variedad y horizonte')
        if comparison['ci95_absolute_reduction'][0]<=0:reasons.append('Intervalo bootstrap incluye ausencia de mejora')
        if comparison['wins_by_origin']<8:reasons.append('Menos de 8 de 12 orígenes favorables')
    else:reasons.append('Ningún challenger completo')
    winner=report['selected_challenger'] if not reasons else 'Naive'
    report.update({'published_model':winner,'promoted':not reasons,'promotion_reasons':reasons or ['Cumple todas las condiciones preespecificadas'],
                   'gate':{'minimum_relative_mae_improvement':minimum_improvement,'alpha':.05,'multiplicity':'Holm: 10 variedades × 6 horizontes; un challenger preseleccionado por selección',
                           'minimum_effective_blocks':6,'minimum_winning_origins':8},
                   'threshold_sensitivity':{str(threshold):bool(comparison and comparison['relative_mae_improvement']>=threshold and not [r for r in reasons if not r.startswith('Mejora')]) for threshold in (0,.03,.05,.1)}})
    for candidate in report['candidates']:
        model=candidate['model']
        try:
            p,meta=predict(model,y,report['horizon']);path=[]
            for lead,price in enumerate(p,1):
                b80,b95=candidate['bands']['80'],candidate['bands']['95']
                path.append({'date':str((y.index[-1]+pd.Timedelta(days=lead)).date()),'lead':lead,'price':round(float(price),6),
                             'low':round(max(.001,float(price)-b80),6),'high':round(float(price)+b80,6),
                             'low95':round(max(.001,float(price)-b95),6),'high95':round(float(price)+b95,6),
                             'model':model,'evaluated_horizon':report['horizon'],
                             'status':'evaluado' if model==winner and report['promoted'] else 'referencia'})
            report['forecast_paths'][model]=path;candidate['current_metadata']=meta
        except ValueError as exc:
            report['failures'].append({'model':model,'phase':'current','reason':str(exc)})
    if winner not in report['forecast_paths']:
        winner='Naive';report.update({'published_model':winner,'promoted':False});report['promotion_reasons'].append('Inferencia actual del candidato rechazada')
    selected=next(c for c in report['candidates'] if c['model']==winner)
    report['published_audit']=selected['audit'];report['published_endpoint_audit']=selected['endpoint_audit']
    report['baseline_audit']=next(c for c in report['candidates'] if c['model']=='Naive')['audit']
    report['forecast']=report['forecast_paths'][winner]
    return report
