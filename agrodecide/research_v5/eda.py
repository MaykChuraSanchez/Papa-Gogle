"""Descriptive diagnostics, never features or model-selection gates."""
import warnings
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, skew, kurtosis, spearmanr
from statsmodels.tsa.stattools import adfuller, kpss, acf, pacf
from statsmodels.tsa.seasonal import STL


def diagnostic_tests(x):
    x=np.asarray(x,float);out={}
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            a=adfuller(x,maxlag=14,regression='c',autolag='AIC')
            out['adf']={'statistic':float(a[0]),'p':float(a[1]),'used_lag':int(a[2]),'n':int(a[3]),
                        'null':'Raíz unitaria; rechazar no prueba estabilidad futura'}
            k=kpss(x,regression='c',nlags='auto')
            out['kpss']={'statistic':float(k[0]),'p_table_bound':float(k[1]),'used_lag':int(k[2]),
                         'null':'Estacionariedad en nivel; p tabulado puede estar acotado'}
        except (ValueError,OverflowError) as exc:out['test_error']=str(exc)
        try:
            a,ci=acf(x,nlags=30,alpha=.05,fft=True)
            p,pci=pacf(x,nlags=30,alpha=.05,method='ywm')
            out['acf']=[{'lag':i,'value':float(v),'low':float(ci[i,0]),'high':float(ci[i,1])} for i,v in enumerate(a)]
            out['pacf']=[{'lag':i,'value':float(v),'low':float(pci[i,0]),'high':float(pci[i,1])} for i,v in enumerate(p)]
        except ValueError as exc:out['correlation_error']=str(exc)
        out['warnings']=sorted(set(str(w.message) for w in caught))
    return out


def describe(frame,y):
    observed=y.dropna();x=y.ffill(limit=7);returns=np.log(x).diff().dropna()
    median=float(observed.median());mad=float((observed-median).abs().median())
    flags=observed[(observed-median).abs()>8*max(mad,1e-6)]
    gaps=y[y.isna()].index
    counts=y.groupby(y.index.dayofweek).count()
    stats={'mean':float(observed.mean()),'median':median,'std':float(observed.std()),
           'coefficient_variation':float(observed.std()/observed.mean()),'min':float(observed.min()),'max':float(observed.max()),
           'skew':float(skew(observed,bias=False)),'excess_kurtosis':float(kurtosis(observed,bias=False)),
           'percentiles':{str(p):float(observed.quantile(p/100)) for p in (1,5,25,50,75,95,99)},
           'log_return_mean':float(returns.mean()),'log_return_std':float(returns.std()),
           'absolute_daily_difference_mean':float(y.diff().abs().mean())}
    quality={'observations':len(observed),'calendar_days':len(y),'coverage_daily':float(y.notna().mean()),
             'missing_dates':[str(d.date()) for d in gaps], 'duplicate_identity_rows':int(frame.duplicated(['fecha','variedad','mercado_id']).sum()),
             'volume_observations':int(frame.volumen_t.notna().sum()),'volume_coverage':float(frame.volumen_t.notna().mean()),
             'volume_zero_count':int(frame.volumen_t.eq(0).sum()),'negative_or_zero_prices':int((observed<=0).sum()),
             'outliers_mad8':[{'date':str(d.date()),'price':float(p)} for d,p in flags.items()],
             'outlier_policy':'Señalar para revisión; no borrar ni winsorizar cotizaciones válidas',
             'first_date':str(y.index[0].date()),'last_date':str(y.index[-1].date()),
             'weekday_observations':{str(k):int(v) for k,v in counts.items()},
             'latency_days':None,'publication_dates_known':False,
             'release_limit':'Vintage actual SISAP; fecha original de publicación y revisiones históricas no recuperadas',
             'fit_imputed_days':int(y.isna().sum()),'target_imputed_days':0,
             'calendar_policy':'Rejilla diaria, domingos incluidos porque se observan cotizaciones. Ausencia no implica precio cero ni cierre confirmado.',
             'minimum_sufficiency':'Cobertura >=85%, dos años, último precio válido y no huecos >7d; potencia inferencial separada',
             'forecast_data_sufficient':bool(y.notna().mean()>=.85 and len(y)>=730 and np.isfinite(y.iloc[-1]) and x.notna().all())}
    result={'statistics':stats,'quality':quality,'levels':diagnostic_tests(x.dropna()),'log_returns':diagnostic_tests(returns),
            'limitations':['Diagnóstico descriptivo con toda la historia; no usado para elegir candidatos ni tuning.',
                           'ADF/KPSS/ACF no certifican predictibilidad ni estacionariedad permanente.',
                           'No precio real deflactado: IPC revisado sin vintage de publicación; no se mezcla con precio nominal.',
                           'Fuente/mercado únicos; procedencia y calidad comercial no disponibles; no precio en chacra.']}
    old=x.iloc[-910:-180].dropna();recent=x.iloc[-180:].dropna();ks=ks_2samp(old,recent)
    bins=np.unique(np.quantile(old,np.linspace(0,1,11)));bins[0]=-np.inf;bins[-1]=np.inf
    a=np.histogram(old,bins)[0]+.5;b=np.histogram(recent,bins)[0]+.5;a=a/a.sum();b=b/b.sum()
    result['drift']={'recent_days':len(recent),'reference_days':len(old),'ks_statistic':float(ks.statistic),
                     'ks_p_exploratory':float(ks.pvalue),'psi':float(np.sum((b-a)*np.log(b/a))),
                     'mean_change_pct':float((recent.mean()/old.mean()-1)*100),
                     'warning':'KS nominal ignora dependencia serial; magnitudes descriptivas, no causalidad ni alarma certificada.'}
    volatility=returns.rolling(30,min_periods=20).std()
    result['volatility']={'current_30d':float(volatility.iloc[-1]),'median_30d':float(volatility.median()),
                          'p90_30d':float(volatility.quantile(.9)),
                          'absolute_returns_acf1':float(returns.abs().autocorr(1))}
    monthly=observed.resample('ME').median();changes=monthly.pct_change().dropna()
    result['large_monthly_changes']=[{'month':str(d.date()),'median_price_change_pct':float(v*100)} for d,v in changes.loc[changes.abs().nlargest(8).index].sort_index().items()]
    result['calendar_months']=[{'month':int(m),'n':len(part),'mean':float(part.mean()),'median':float(part.median())}
                               for m,part in observed.groupby(observed.index.month)]
    strengths={}
    for period in (7,365):
        if len(x)>=3*period:
            decomposition=STL(x,period=period,robust=True,seasonal=7,seasonal_jump=7,trend_jump=7,low_pass_jump=7).fit()
            strengths[str(period)]=float(max(0,1-np.var(decomposition.resid)/max(np.var(decomposition.resid+decomposition.seasonal),1e-12)))
    result['stl_strength_descriptive']=strengths
    f=frame.set_index(pd.to_datetime(frame.fecha)).sort_index();volume=f.volumen_t.asfreq('D')
    leadlag=[]
    for lag in (1,7,14,30,60,90):
        pair=pd.concat([volume.shift(lag),np.log(y).diff(7)],axis=1).dropna()
        if len(pair)>=60 and pair.iloc[:,0].nunique()>1:
            rho,_=spearmanr(pair.iloc[:,0],pair.iloc[:,1]);leadlag.append({'lag_days':lag,'spearman':float(rho),'n':len(pair)})
    result['volume_lead_lag_exploratory']=leadlag
    result['volume_limit']='Relación exploratoria; volumen SISAP sin publicación original, excluido de este experimento de pronóstico.'
    result['history_monthly']=[{'date':str(d.date()),'price':float(p)} for d,p in monthly.items() if np.isfinite(p)]
    return result


def plot_report(y,report,path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,axes=plt.subplots(2,2,figsize=(12,7),layout='constrained')
    axes[0,0].plot(y.index,y,color='#173e35',linewidth=.8);axes[0,0].set(title='Precio mayorista nominal',ylabel='PEN/kg')
    logreturns=np.log(y).diff();axes[0,1].plot(y.index,logreturns,color='#647b55',linewidth=.6);axes[0,1].set(title='Retorno log diario (objetivos sin imputar)')
    for key,color in [('levels','#173e35'),('log_returns','#93aa46')]:
        values=report[key].get('acf',[])[1:];axes[1,0].plot([v['lag'] for v in values],[v['value'] for v in values],label=key,color=color)
    axes[1,0].axhline(0,color='#aaa',linewidth=.6);axes[1,0].legend();axes[1,0].set(title='ACF descriptiva',xlabel='Rezago diario')
    v=[r['median'] for r in report['calendar_months']];axes[1,1].bar(range(1,13),v,color='#adc65a');axes[1,1].set(title='Mediana por mes (no causal)',xlabel='Mes',ylabel='PEN/kg')
    fig.suptitle('Papa '+report['variety']+' · GMML Lima · '+report['quality']['last_date'],fontsize=13)
    fig.savefig(path,dpi=110);plt.close(fig)
