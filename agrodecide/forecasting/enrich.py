"""Cached per-model inference, real ablations and conditional ENFEN sensitivity."""
from hashlib import sha256
import json
import numpy as np
import pandas as pd
from agrodecide.v4.storage import DATA,read,atomic_json,now
from agrodecide.v4.modeling import series
from .engine import prediction,metric_rows,IMPLEMENTATION,specs,records_for,combine_rows
from .features import build,load_alerts


def diagnostics(y):
    """Descriptive checks only; never fed back into model or feature selection."""
    from statsmodels.tsa.stattools import acf,adfuller
    clean=y.ffill(limit=7).dropna();changes=clean.diff().dropna()
    correlation=acf(clean,nlags=min(365,len(clean)//3),fft=True)
    returns=acf(changes,nlags=min(365,len(changes)//3),fft=True)
    adf=adfuller(np.log(clean.iloc[-730:]),autolag='AIC',maxlag=8)
    annual=[]
    for year,part in y.groupby(y.index.year):
        observed=part.dropna()
        annual.append({'year':int(year),'n':len(observed),'mean':float(observed.mean()),'std':float(observed.std()),'min':float(observed.min()),'max':float(observed.max())})
    return {'autocorrelation':[{'lag_days':lag,'price':float(correlation[lag]),'price_difference':float(returns[lag])} for lag in [1,2,3,7,14,30,60,90,365] if lag<len(returns)],
            'adf_latest_training_log_price':{'statistic':float(adf[0]),'pvalue':float(adf[1]),'lags':int(adf[2]),'observations':int(adf[3])},
            'annual_regimes':annual,'note':'Diagnósticos descriptivos del histórico vigente. ADF y autocorrelación no acreditan causalidad ni seleccionan variables con la auditoría.'}


def interval_contains(actual,predicted,width):
    # Currency values on an empirical quantile can differ by a few binary ULPs.
    # Use the published bounds and a negligible PEN/kg tolerance consistently.
    return max(.01,predicted-width)-1e-12<=actual<=predicted+width+1e-12


def reconcile_audit(evaluation,y,features):
    """Independent publication gate from saved out-of-sample predictions.

    Point scores must reconcile; coverage is recomputed against the actual
    emitted bounds, with a documented floating point tolerance. This does not
    change fitting, candidate selection, ensemble weights or calibration widths.
    """
    h=evaluation['horizon'];lookup={s['id']:s for s in specs(h,features.loc[:evaluation['plan']['selection'][0]])};rows_by_model={}
    for candidate in evaluation['candidates']:
        if candidate['family']=='Ensemble':continue
        rows=[]
        for origin in evaluation['plan']['audit']:
            date=pd.Timestamp(origin);p,_,_=prediction(lookup[candidate['id']],y.loc[:date],features.loc[:date],h)
            rows.extend(records_for(y,date,h,p))
        rows_by_model[candidate['id']]=rows
    for candidate in evaluation['candidates']:
        if candidate['family']=='Ensemble':rows_by_model[candidate['id']]=combine_rows([rows_by_model[k] for k in candidate['components']],candidate['weights'])
    for candidate in evaluation['candidates']:
        rows=rows_by_model[candidate['id']];scores=metric_rows(rows)
        if abs(scores['mae']-candidate['audit']['mae'])>1e-10 or scores['n']!=candidate['audit']['n']:raise ValueError('Auditoría no reconciliada: '+candidate['id'])
        for level in [80,95]:scores[f'coverage{level}']=float(np.mean([interval_contains(r['actual'],r['predicted'],candidate[f'width{level}']) for r in rows]))
        candidate['audit']=scores
    deployed=next(c for c in evaluation['candidates'] if c['id']==evaluation['deployed'])
    baseline=next(c for c in evaluation['candidates'] if c['name']=='Naive')
    evaluation['audit']=deployed['audit'];evaluation['baseline_audit']=baseline['audit']
    evaluation['audit_rows']=[{**r,'residual':r['actual']-r['predicted'],'covered':interval_contains(r['actual'],r['predicted'],deployed['width80']),
                              'low80':max(.01,r['predicted']-deployed['width80']),'high80':r['predicted']+deployed['width80'],
                              'low95':max(.01,r['predicted']-deployed['width95']),'high95':r['predicted']+deployed['width95']} for r in rows_by_model[deployed['id']]]
    evaluation['interval_numerical_tolerance_pen_kg']=1e-12

def run(variety='Única'):
    path=DATA/'forecasting'/'reports'/(variety+'.json')
    report=json.loads(path.read_text(encoding='utf-8'))
    if report['implementation_hash']!=IMPLEMENTATION:raise ValueError('Código distinto al evaluado; repetir backtest antes de publicar')
    frame=read('prices');frame=frame[(frame.variedad==variety)&(frame.mercado_id=='15011501')].sort_values('fecha')
    y=series(frame);alerts=load_alerts();features=build(frame,y,alerts)
    if sha256(y.to_csv().encode()).hexdigest()!=report['data_hash']:raise ValueError('Los precios cambiaron desde el backtest')
    report['feature_data_hash']=sha256(features.to_csv().encode()).hexdigest()
    report['enfen_vintage_hash']=sha256(json.dumps(alerts,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    report['analysis']['diagnostics']=diagnostics(y)
    report['alert_availability_caveat']='Disponibilidad ENFEN reconstruida como máximo de fecha impresa y versión pública del archivo (ind), más un día. No es un log certificado de primera publicación; archivos sin versión verificable quedan excluidos.'
    for evaluation in report['evaluations']:
        reconcile_audit(evaluation,y,features)
        h=evaluation['horizon'];predictions={};failures=[]
        evaluation['intervals_adequate']=evaluation['audit']['coverage80']>=.75 and evaluation['audit']['coverage95']>=.90
        for candidate in evaluation['candidates']:
            if candidate['family']=='Ensemble':continue
            try:
                p,meta,_=prediction(candidate,y,features,h)
                predictions[candidate['id']]={'prices':[float(v) for v in p],'metadata':meta}
            except Exception as exc:failures.append({'model':candidate['id'],'reason':str(exc)})
        for candidate in evaluation['candidates']:
            if candidate['family']!='Ensemble':continue
            if all(key in predictions for key in candidate['components']):
                values=np.average([predictions[key]['prices'] for key in candidate['components']],axis=0,weights=candidate['weights'])
                predictions[candidate['id']]={'prices':values.tolist(),'metadata':candidate['metadata']}
            else:failures.append({'model':candidate['id'],'reason':'Un componente no pudo generar una curva actual válida'})
        evaluation['candidate_forecasts']=predictions;evaluation['inference_failures']=failures
        # Paired ablation: same model, direct strategy, exact same outer origins.
        ablations=[]
        for name in ['SARIMAX','Decision Tree','Random Forest','XGBoost','LightGBM','CatBoost']:
            reference=None
            for config in ['A','B','C','D','E','A+ENFEN']:
                c=next((r for r in evaluation['candidates'] if r['name']==name and r['configuration']==config and r['strategy']=='direct'),None)
                if c:
                    base=next((r for r in evaluation['candidates'] if r['name']==name and r['configuration']=='A' and r['strategy']=='direct'),None)
                    prior=reference if config in {'B','C','D','E'} else base if config=='A+ENFEN' else None
                    ablations.append({'model':name,'configuration':config,'horizon':h,'state':'calculado','deployable':c['deployable'],**c['audit'],'delta_mae':c['audit']['mae']-prior['audit']['mae'] if prior else None,
                                      'compared_with':prior['configuration'] if prior else None,'availability':report['availability'].get(config,{})})
                    if config in {'A','B','C','D','E'}:reference=c
                else:ablations.append({'model':name,'configuration':config,'horizon':h,'state':'pendiente','reason':report['availability'].get(config,{}).get('reason','No hay ajuste válido con estas entradas')})
        evaluation['ablations']=ablations
        # Sensitivity uses a real fitted tree with ENFEN covariates. It need not be
        # the deployed champion; show its validation status and audit explicitly.
        candidates=[c for c in evaluation['candidates'] if c['configuration']=='A+ENFEN' and c['name']!='SARIMAX' and c['strategy']=='direct' and c['id'] in predictions]
        scenarios=[]
        if candidates:
            candidate=min(candidates,key=lambda r:r['selection_score']);base=np.asarray(predictions[candidate['id']]['prices'])
            try:
                _,explanation,_=prediction(candidate,y,features,h,explain=True)
                predictions[candidate['id']]['metadata']=explanation
            except Exception as exc:predictions[candidate['id']]['metadata']['explanation_unavailable']=str(exc)
            for label,state in [('Hipótesis neutral',0),('Hipótesis de vigilancia de El Niño Costero',3),('Hipótesis de alerta de El Niño Costero',1)]:
                try:
                    p,meta,_=prediction(candidate,y,features,h,scenario=state)
                    scenarios.append({'name':label,'state':state,'model':candidate['id'],'price_mean':float(p.mean()),'base_mean':float(base.mean()),'difference':float((p-base).mean()),'difference_pct':float((p.mean()/base.mean()-1)*100),'prices':p.tolist(),
                                     'assumption':'Se cambia solo la categoría de alerta disponible en origen, sin reescribir rezagos ni inventar ICEN. Estado mantenido como hipótesis; no es un pronóstico de ENFEN.',
                                     'intervals':'No calibrados para la intervención hipotética','audit_mae':candidate['audit']['mae']})
                except Exception as exc:scenarios.append({'name':label,'state':state,'reason':str(exc)})
        evaluation['enfen_scenarios']=scenarios
        rows=evaluation['audit_rows'];groups=[]
        for variable in ['month','season','enfen_alert','volatility']:
            buckets={}
            for row in rows:
                date=pd.Timestamp(row['date']);origin=pd.Timestamp(row['origin'])
                if variable=='month':key=str(date.month)
                elif variable=='season':key=['verano','otoño','invierno','primavera'][(date.month%12)//3]
                elif variable=='volatility':
                    volatility=y.loc[:origin].pct_change(fill_method=None).rolling(30,min_periods=20).std()
                    current=volatility.iloc[-1];threshold=volatility.dropna().quantile(.75)
                    key='Alta volatilidad en origen' if current>threshold else 'Volatilidad habitual en origen'
                else:
                    known=[r for r in alerts if r.get('vintage_eligible',False) and pd.Timestamp(r['fecha_disponibilidad'])<=origin]
                    latest=max(known,key=lambda r:(r['fecha_publicacion'],r['fecha_disponibilidad'])) if known else None
                    key=(latest['version_metodologica']+' / '+latest['clasificacion']) if latest and (origin-pd.Timestamp(latest['fecha_disponibilidad'])).days<=100 else 'Sin comunicado reciente verificable'
                buckets.setdefault(key,[]).append(row)
            for label,part in buckets.items():groups.append({'dimension':variable,'group':label,**metric_rows(part),'origins':len(set(r['origin'] for r in part))})
        evaluation['error_groups']=groups
        print('Enriquecido',h,'curvas',len(predictions),'escenarios',len(scenarios),flush=True)
    report['enriched_at']=now().isoformat();report['publication_validation_version']=1;atomic_json(path,report)
    registry=DATA/'forecasting'/'registry'/report['generated_at'].replace(':','-')/(variety+'_'+report['enriched_at'].replace(':','-')+'.json')
    atomic_json(registry,report)
    # From this issue onward the platform can measure genuinely prospective error.
    ledger=DATA/'forecasting'/'issued'/str(now().date())/(variety+'_'+report['data_hash'][:12]+'.json')
    if not ledger.exists():atomic_json(ledger,{'issued_at':now().isoformat(),'origin':report['last_date'],'variety':variety,'market_id':'15011501','forecasts_by_horizon':report['forecasts_by_horizon'],'engine_version':report['engine_version']})
    return report

if __name__=='__main__':run()
