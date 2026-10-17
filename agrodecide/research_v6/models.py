"""Frozen price-only candidates. Every function receives a training prefix only."""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import HistGradientBoostingRegressor
from agrodecide.research_v5.models import prepared, ar1

MODELS = ('Naive', 'Referencia anual', 'AR1 365', 'AR1 730',
          'Tendencia amortiguada', 'Fourier 730', 'Fourier 1460',
          'Ridge directo 10', 'Ridge directo 100', 'Boosting directo')
LEADS = (7,15,30,60,90,120,150,180,210,240)


def calendar(days):
    angle=2*np.pi*np.asarray(days)/365.25
    return np.column_stack([f(k*angle) for k in (1,2) for f in (np.sin,np.cos)])


def direct_features(z, dates, anchors, leads):
    """All price indexes <= anchor; annual target reference is already known."""
    anchors=np.asarray(anchors,dtype=int);leads=np.asarray(leads,dtype=int)
    if (leads<1).any() or (leads>240).any() or (anchors<365).any():
        raise ValueError('Anclas y plazos fuera del contrato')
    series=pd.Series(z)
    avgs=[series.rolling(w).mean().to_numpy() for w in (7,28,90,365)]
    vol=series.diff().rolling(28).std().to_numpy()
    base=z[anchors]
    cols=[base, *[a[anchors]-base for a in avgs],vol[anchors],
          z[anchors]-z[anchors-7],z[anchors]-z[anchors-28],
          z[anchors+leads-365]-base,leads/240]
    target_days=(dates[anchors]-pd.Timestamp('2000-01-01')).days.to_numpy()+leads
    cal=calendar(target_days)
    return np.column_stack([*cols,cal,cal*(leads/240)[:,None]])


def direct_training(x):
    z=np.log(x.to_numpy());n=len(x)
    a=np.arange(max(365,n-1460),n-7,7)
    anchors=np.repeat(a,len(LEADS));leads=np.tile(LEADS,len(a))
    ok=anchors+leads<n;anchors=anchors[ok];leads=leads[ok]
    features=direct_features(z,x.index,anchors,leads)
    # Training labels may have causal fills; outer test labels never do.
    labels=z[anchors+leads]-z[anchors]
    future=direct_features(z,x.index,np.repeat(n-1,240),np.arange(1,241))
    return features,labels,future


def forecasts(y):
    x=prepared(y,1095);n=len(x);last=float(x.iloc[-1]);pred={};meta={};failures={}
    training=None
    for name in MODELS:
        try:
            info={'training_end':str(y.index[-1].date()),'training_days':len(x)}
            if name=='Naive':p=np.repeat(last,240)
            elif name=='Referencia anual':p=x.to_numpy()[n-365:n-125]
            elif name.startswith('AR1'):
                p,info=ar1(y,240,int(name.split()[-1]))
            elif name=='Tendencia amortiguada':
                values=x.to_numpy()[-28:];t=np.arange(len(values))
                slope=float(np.polyfit(t,values,1)[0]);lead=np.arange(1,241)
                p=last+slope*np.sum(np.exp(-np.arange(1,241)/30)[:,None]*
                                     (np.arange(1,241)[:,None]<=lead[None,:]),axis=0)
                info['slope_pen_per_day']=slope
            elif name.startswith('Fourier'):
                window=int(name.split()[-1]);xx=x.iloc[-window:]
                days=(xx.index-pd.Timestamp('2000-01-01')).days
                design=calendar(days);fit=Ridge(alpha=10).fit(design,np.log(xx.to_numpy()))
                residual=np.log(xx.to_numpy())-fit.predict(design)
                future_days=(x.index[-1]-pd.Timestamp('2000-01-01')).days+np.arange(1,241)
                p=np.exp(fit.predict(calendar(future_days))+residual[-28:].mean()*np.exp(-np.arange(1,241)/180))
                info.update(window_days=min(window,n),harmonics=2,alpha=10,level_decay_days=180)
            else:
                if training is None:training=direct_training(x)
                features,labels,future=training
                if name.startswith('Ridge'):
                    scale=StandardScaler().fit(features)
                    fit=Ridge(alpha=float(name.split()[-1])).fit(scale.transform(features),labels)
                    returns=fit.predict(scale.transform(future))
                else:
                    fit=HistGradientBoostingRegressor(max_iter=100,max_leaf_nodes=15,
                        l2_regularization=10,learning_rate=.05,random_state=20261016).fit(features,labels)
                    returns=fit.predict(future)
                p=last*np.exp(returns)
                info.update(training_pairs=len(labels),target='Cambio log del precio desde el origen',
                            point='Mediana estimada; no media lognormal')
            p=np.asarray(p,float)
            if p.shape!=(240,) or not np.isfinite(p).all() or (p<=0).any() or (p>100).any():
                raise ValueError('Predicción inválida o fuera del contrato (0,100] PEN/kg')
            pred[name]=p;meta[name]=info
        except (ValueError,OverflowError,np.linalg.LinAlgError) as exc:failures[name]=str(exc)
    return pred,meta,failures
