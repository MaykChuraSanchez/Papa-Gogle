"""Ten price-only classical models and six independent multivariable estimators."""
from functools import lru_cache
import warnings
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.holtwinters import Holt,ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.seasonal import seasonal_decompose
from . import features as ft

CLASSICAL=['Naive','Seasonal Naive','Holt Linear','Holt Damped','Holt-Winters aditivo','Holt-Winters multiplicativo','Holt-Winters aditivo amortiguado','Holt-Winters multiplicativo amortiguado','ARIMA','SARIMA']
MULTIVARIATE=['SARIMAX','Decision Tree','Random Forest','XGBoost','LightGBM','CatBoost']

def usable(y):
    # Price-only causal fill for model fitting, never for scoring targets.
    x=y.iloc[-1460:].ffill(limit=7)
    start=x.first_valid_index()
    if start is None:raise ValueError('Sin precios')
    x=x.loc[start:]
    if x.isna().any() or len(x)<730 or not np.isfinite(y.iloc[-1]):raise ValueError('Faltan 730 días utilizables o hay una interrupción >7 días')
    return x

def seasonality(y):
    """Training-only additive seasonal strength, supported by at least 3 cycles."""
    result=[]
    for period in [7,365]:
        if len(y)<period*3:continue
        dec=seasonal_decompose(y,model='additive',period=period,extrapolate_trend=0)
        valid=dec.resid.notna()
        noise=np.var(dec.resid[valid]);total=np.var((dec.resid+dec.seasonal)[valid])
        strength=max(0.,1-noise/total) if total>1e-9 else 0.
        result.append({'period':period,'strength':float(strength)})
    eligible=[r for r in result if r['strength']>=.15]
    chosen=max(eligible,key=lambda r:r['strength'])['period'] if eligible else None
    return chosen,result

def classical(name,y,h):
    if name not in CLASSICAL:raise ValueError('Familia clásica inválida')
    x=usable(y);values=x.to_numpy();meta={'family':'Clásico','features':['precio histórico'],'training_rows':len(x),'imputation':'ffill causal máximo 7 días; objetivos sin rellenar'}
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        if name=='Naive':return np.repeat(values[-1],h),meta
        period,evidence=seasonality(x);meta['seasonality_evidence']=evidence
        if name=='Seasonal Naive':
            if period is None:raise ValueError('Estacionalidad no respaldada por el histórico de entrenamiento')
            meta['seasonal_period']=period
            return np.tile(values[-period:],int(np.ceil(h/period)))[:h],meta
        if name.startswith('Holt-Winters'):
            if period is None:raise ValueError('Sin evidencia estacional suficiente')
            mult='multiplicativo' in name;damped='amortiguado' in name
            if mult and (values<=0).any():raise ValueError('La formulación multiplicativa requiere precios positivos')
            # Fixed smoothing grid selected using a strictly internal 30-day holdout.
            candidates=[]
            for alpha,gamma in [(.2,.05),(.5,.1)]:
                try:
                    fitted=ExponentialSmoothing(x.iloc[:-30],trend='add',seasonal='mul' if mult else 'add',seasonal_periods=period,damped_trend=damped,initialization_method='heuristic').fit(smoothing_level=alpha,smoothing_trend=.02,smoothing_seasonal=gamma,damping_trend=.98 if damped else None,optimized=False)
                    p=np.asarray(fitted.forecast(30));score=float(np.mean(np.abs(p-values[-30:])))
                    candidates.append((score,alpha,gamma))
                except (ValueError,IndexError):continue
            if not candidates:raise ValueError('No se pudo ajustar la estacionalidad en validación interna')
            _,alpha,gamma=min(candidates)
            fitted=ExponentialSmoothing(x,trend='add',seasonal='mul' if mult else 'add',seasonal_periods=period,damped_trend=damped,initialization_method='heuristic').fit(smoothing_level=alpha,smoothing_trend=.02,smoothing_seasonal=gamma,damping_trend=.98 if damped else None,optimized=False)
            meta.update(seasonal_period=period,smoothing_level=alpha,smoothing_seasonal=gamma,smoothing_trend=.02,damped=damped,parameter_selection='últimos 30 días dentro del entrenamiento')
            return np.asarray(fitted.forecast(h)),meta
        if name in {'Holt Linear','Holt Damped'}:
            fitted=Holt(x.iloc[-365:],damped_trend=name=='Holt Damped',initialization_method='estimated').fit(optimized=True)
            meta['params']={k:float(v) for k,v in fitted.params.items() if np.isscalar(v) and not isinstance(v,(str,bool)) and np.isfinite(v)}
            return np.asarray(fitted.forecast(h)),meta
        if name=='ARIMA':
            v=np.log(x.iloc[-730:]);pvalue=float(adfuller(v,autolag='AIC',maxlag=8)[1]);d=1 if pvalue>.05 else 0
            candidates=[]
            for p,q in [(0,0),(1,0),(0,1),(1,1)]:
                fit=SARIMAX(v,order=(p,d,q),trend='c' if d==0 else 'n',enforce_stationarity=True,enforce_invertibility=True).fit(disp=False,maxiter=50)
                if np.isfinite(fit.aic):candidates.append(fit)
            fit=min(candidates,key=lambda f:f.aic)
            meta.update(order=list(fit.model.order),aic=float(fit.aic),adf_pvalue=pvalue,selection='AIC solo sobre entrenamiento',log_transform=True)
            lb=acorr_ljungbox(fit.resid.dropna().iloc[10:],lags=[7,14],return_df=True)
            meta['ljung_box_pvalues']={str(k):float(v) for k,v in lb.lb_pvalue.items() if np.isfinite(v)}
            return np.exp(np.asarray(fit.forecast(h))),meta
        if name=='SARIMA':
            if period is None:raise ValueError('SARIMA no impone una estación sin evidencia')
            if period==365:
                # Completed calendar weeks, annual differencing of 52 weeks.
                # simple_differencing returns differences, inverted with known lags.
                weekly=x.resample('W-SUN').mean();counts=x.resample('W-SUN').count();weekly=weekly[(weekly.index<=x.index[-1])&(counts==7)]
                if len(weekly)<156:raise ValueError('Faltan tres años de semanas completas')
                log=np.log(weekly);s=52
                fit=SARIMAX(log,order=(1,0,0),seasonal_order=(0,1,0,s),simple_differencing=True).fit(disp=False,maxiter=40)
                dates=pd.date_range(x.index[-1]+pd.Timedelta(days=1),periods=h)
                steps=((dates-weekly.index[-1]).days.to_numpy()+6)//7
                diff=np.asarray(fit.forecast(int(steps.max())))
                # h≤240 -> <52 weeks, so all inverse-difference values are known.
                level=diff+log.iloc[-52:].to_numpy()[:len(diff)]
                meta.update(order=[1,0,0],seasonal_order=[0,1,0,52],frequency='semanas completas, promedio del precio',inverse_differencing='lag 52 conocido en el origen')
                return np.exp(level[steps-1]),meta
            fit=SARIMAX(np.log(x.iloc[-730:]),order=(1,1,0),seasonal_order=(1,0,0,7),simple_differencing=False).fit(disp=False,maxiter=40)
            meta.update(order=[1,1,0],seasonal_order=[1,0,0,7],log_transform=True)
            return np.exp(np.asarray(fit.forecast(h))),meta
    raise ValueError('Modelo clásico no implementado')

def estimator(name):
    if name=='Decision Tree':return DecisionTreeRegressor(max_depth=5,min_samples_leaf=25,random_state=42)
    if name=='Random Forest':return RandomForestRegressor(n_estimators=80,max_depth=7,min_samples_leaf=12,max_features=.75,n_jobs=2,random_state=42)
    if name=='XGBoost':
        from xgboost import XGBRegressor
        return XGBRegressor(n_estimators=100,max_depth=3,learning_rate=.05,subsample=.9,colsample_bytree=.9,reg_lambda=6,n_jobs=2,random_state=42,objective='reg:squarederror')
    if name=='LightGBM':
        from lightgbm import LGBMRegressor
        return LGBMRegressor(n_estimators=100,max_depth=5,num_leaves=15,min_child_samples=30,learning_rate=.05,reg_lambda=6,n_jobs=2,random_state=42,verbosity=-1)
    if name=='CatBoost':
        from catboost import CatBoostRegressor
        return CatBoostRegressor(iterations=100,depth=4,learning_rate=.05,l2_leaf_reg=6,thread_count=2,random_seed=42,verbose=False,allow_writing_files=False)
    raise ValueError('Estimador desconocido')

def multivariate(name,y,features,h,configuration='A',strategy='direct',explain=False,scenario=None):
    if name not in MULTIVARIATE:raise ValueError('Familia multivariable inválida')
    n=len(y);raw=y.to_numpy(float);filled=y.ffill(limit=7).to_numpy(float)
    ocean_available=any(c.startswith('enfen_indice_') and pd.notna(features.iloc[-1][c]) for c in features)
    if configuration in {'A+ENFEN','B+ENFEN','E'} and features.iloc[-1].get('enfen_conocido_lag0',0)<.5 and not ocean_available:
        raise ValueError('No hay una alerta ENFEN fechada suficientemente reciente en el origen')
    if not np.isfinite(raw[-1]):raise ValueError('El último precio debe estar observado')
    if name=='SARIMAX':return sarimax(y,features,h,configuration,scenario)
    if strategy not in {'direct','recursive'}:raise ValueError('Estrategia no soportada')
    # Separate estimator for each requested horizon. The lead is an input for
    # direct multi-step prediction; all labels must be known at the fit origin.
    leads=[1] if strategy=='recursive' else sorted(set([1, min(7,h),min(15,h),min(30,h),min(60,h),min(90,h),min(180,h),h]))
    arrays=[];labels=[];anchor_rows=[];label_dates=[]
    for lead in leads:
        anchors=np.arange(max(365,n-1460),n-lead,7)
        x,names=ft.design(features,anchors,np.repeat(lead,len(anchors)),configuration)
        target=raw[anchors+lead];base=filled[anchors]
        valid=np.isfinite(target)&np.isfinite(base)&(target>0)&(base>0)
        arrays.append(x[valid]);labels.append(np.log(target[valid]/base[valid]));anchor_rows.append(anchors[valid]);label_dates.append(anchors[valid]+lead)
    x=np.concatenate(arrays);label=np.concatenate(labels)
    anchor_rows=np.concatenate(anchor_rows);label_dates=np.concatenate(label_dates)
    order=np.argsort(anchor_rows,kind="stable");x=x[order];label=label[order];anchor_rows=anchor_rows[order];label_dates=label_dates[order]
    if len(label)<100:raise ValueError('Menos de 100 objetivos de entrenamiento válidos')
    support=np.isfinite(x).mean(axis=0)>=.6
    if support.sum()<3:raise ValueError('Variables insuficientes')
    model=make_pipeline(SimpleImputer(strategy='median',add_indicator=True),estimator(name))
    with warnings.catch_warnings():
        warnings.simplefilter('ignore');model.fit(x[:,support],label)
    chosen=[v for v,keep in zip(names,support) if keep]
    if strategy=='direct':
        test,_=ft.design(features,np.repeat(n-1,h),np.arange(1,h+1),configuration)
        if scenario is not None:test=apply_scenario(test,names,scenario)
        with warnings.catch_warnings():
            warnings.simplefilter('ignore');p=raw[-1]*np.exp(model.predict(test[:,support]))
    else:
        values=list(raw);p=[]
        original=features.iloc[-1].copy()
        for step in range(1,h+1):
            idx=pd.date_range(y.index[0],periods=len(values))
            simulated=pd.Series(values,index=idx)
            # Only prices are recursively updated. External state is frozen at
            # the original issue origin, never replaced with future observations.
            row=ft.prices(simulated).iloc[[-1]].copy()
            for col in features:
                if col not in row:row[col]=original[col]
            row=row.reindex(columns=features.columns)
            test,_=ft.design(row,[0],[1],configuration)
            if scenario is not None:test=apply_scenario(test,names,scenario)
            with warnings.catch_warnings():
                warnings.simplefilter('ignore');value=values[-1]*float(np.exp(model.predict(test[:,support])[0]))
            values.append(value);p.append(value)
        p=np.asarray(p)
    meta={'family':'Multivariable','configuration':configuration,'strategy':strategy,'training_rows':len(label),
          'features':chosen,'dropped_insufficient_support':[v for v,k in zip(names,support) if not k],
          'target':'log(precio futuro / precio en origen)','imputation':'mediana estimada solo dentro del entrenamiento + indicador de ausencia',
          'future_covariates':'estado publicado conocido en origen, mantenido constante; no es pronóstico oficial de las covariables',
          'params':{k:v for k,v in model[-1].get_params().items() if isinstance(v,(str,int,float,bool,type(None))) and (not isinstance(v,float) or np.isfinite(v))}}
    if explain:
        from sklearn.inspection import permutation_importance
        # Diagnostic only, not a feature selector: held-out chronological tail
        # refitted separately, never the outer audit set.
        split=int(len(label)*.8)
        purge=label_dates[:split]<=anchor_rows[split]
        probe=make_pipeline(SimpleImputer(strategy='median',add_indicator=True),estimator(name))
        probe.fit(x[:split][purge][:,support],label[:split][purge])
        result=permutation_importance(probe,x[split:,support],label[split:],n_repeats=3,random_state=42,scoring='neg_mean_absolute_error',n_jobs=1)
        meta['permutation_diagnostic']=[{'variable':c,'increase_mae_log_ratio':float(v),'std':float(s)} for c,v,s in sorted(zip(chosen,result.importances_mean,result.importances_std),key=lambda z:z[1],reverse=True)[:20]]
        meta['permutation_note']='Cola cronológica interna con purga de etiquetas que cruzan el corte; diagnóstico no usado para elegir variables o ganador.'
        try:
            import shap
            transformed=model[0].transform(x[-48:,support])
            explainer=shap.TreeExplainer(model[-1])
            values=np.asarray(explainer.shap_values(transformed))
            labels_out=list(model[0].get_feature_names_out(chosen))
            importance=np.abs(values).mean(axis=0)
            meta['shap_diagnostic']=[{'variable':str(c),'mean_abs_shap_log_ratio':float(v)} for c,v in sorted(zip(labels_out,importance),key=lambda z:z[1],reverse=True)[:20]]
            meta['shap_note']='Contribuciones del modelo sobre 48 ejemplos de entrenamiento; no causalidad ni evidencia de mejora fuera de muestra.'
        except Exception as exc:meta['shap_unavailable']=str(exc)
    return p,meta

def apply_scenario(test,names,state):
    result=test.copy()
    # Current bulletin only: never rewrite historical lags or the ocean index.
    active=[n for n in names if n.startswith('enfen_v') and '_lag0_' in n]
    versions={n.split('_')[1] for n in active if np.isfinite(result[0,names.index(n)]) and result[0,names.index(n)]==1}
    for n in active:
        version=n.split('_')[1];result[:,names.index(n)]=float(version in versions and n.endswith('_s'+str(state)))
    return result

def sarimax(y,features,h,configuration,scenario):
    selected=[c for c in ft.columns(features,configuration) if not c.startswith('precio_')]
    if not selected:raise ValueError('SARIMAX requiere covariables; ARIMA ya cubre precio solo')
    target=np.log(y.ffill(limit=7).iloc[-1460:]);exog=features.loc[target.index,selected].copy()
    supported=exog.columns[(exog.notna().mean()>=.6)&(exog.std(skipna=True)>.001)]
    if not len(supported):raise ValueError('Sin covariables con soporte y variación')
    # Correlation screening happens only inside this training sample.
    ranks=[]
    for col in supported:
        pair=pd.concat([exog[col],target.diff()],axis=1).dropna()
        r=abs(spearmanr(pair.iloc[:,0],pair.iloc[:,1]).statistic) if len(pair)>30 else 0
        ranks.append((float(r) if np.isfinite(r) else 0,col))
    chosen=[c for _,c in sorted(ranks,reverse=True)[:4]]
    good=target.notna();target=target[good];exog=exog.loc[good,chosen]
    preprocessing=make_pipeline(SimpleImputer(strategy='median'),StandardScaler())
    x=preprocessing.fit_transform(exog.to_numpy())
    future=exog.iloc[[-1]].to_numpy().repeat(h,axis=0)
    if scenario is not None:future=apply_scenario(future,chosen,scenario)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        fit=SARIMAX(target,exog=x,order=(1,1,0),trend='n').fit(disp=False,maxiter=60)
    p=np.exp(np.asarray(fit.forecast(h,exog=preprocessing.transform(future))))
    return p,{'family':'Multivariable','configuration':configuration,'strategy':'exogenous_state_scenario',
              'features':chosen,'order':[1,1,0],'training_rows':len(target),
              'future_covariates':'Último estado disponible constante, escenario explícito; no observaciones futuras',
              'selection':'Spearman dentro del entrenamiento, hasta 4 variables no constantes','aic':float(fit.aic)}
