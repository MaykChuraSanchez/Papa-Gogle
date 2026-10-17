"""Prequential selection with explicitly matured targets and paired audit."""
import numpy as np
from .models import MODELS

HORIZONS=(7,15,30,90,150,180,240)
TARGETS=('endpoint','harvest_mean')


def target_bounds(h,target):
    return (h-1,h) if target=='endpoint' else (max(0,h-30),h)


def aggregate(values,h,target):
    a,b=target_bounds(h,target);x=np.asarray(values,float)[a:b]
    if len(x)!=b-a or np.isfinite(x).sum()<.8*len(x):return None
    return float(np.nanmean(x))


def choose(past,origin,available):
    mature=[r for r in past if r['target_end']<=origin]
    scores={}
    # Each candidate is compared with Naive on the same mature origins.
    for model in MODELS:
        if model not in available:continue
        common=[r for r in mature if model in r['predictions'] and 'Naive' in r['predictions']][-12:]
        if len(common)<6:continue
        # Candidates require ALL of the last available 12 reference origins.
        reference=[r for r in mature if 'Naive' in r['predictions']][-12:]
        if [r['origin'] for r in common]!=[r['origin'] for r in reference]:continue
        scores[model]=float(np.mean([abs(r['predictions'][model]-r['actual']) for r in common]))
    winner=min(scores,key=lambda m:(scores[m],MODELS.index(m))) if scores else 'Naive'
    return winner,scores


def interval(past,origin,prediction,level):
    mature=[abs(r['policy']-r['actual']) for r in past if r['target_end']<=origin and r['selection_scores']][-36:]
    rank=int(np.ceil((len(mature)+1)*level))
    if len(mature)<12 or rank>len(mature):return None
    width=float(np.sort(mature)[rank-1]);return [max(0,prediction-width),prediction+width]


def metrics(rows,key):
    rows=[r for r in rows if key in r['predictions'] or key=='policy']
    if not rows:return None
    actual=np.array([r['actual'] for r in rows]);pred=np.array([r['policy'] if key=='policy' else r['predictions'][key] for r in rows])
    err=pred-actual
    return {'n':len(rows),'mae':float(abs(err).mean()),'rmse':float(np.sqrt(np.mean(err**2))),
            'bias':float(err.mean()),'wape':float(abs(err).sum()/actual.sum())}


def bootstrap(difference,block):
    diff=np.asarray(difference);n=len(diff);rng=np.random.default_rng(20261016)
    starts=rng.integers(0,n,(4999,int(np.ceil(n/block))))
    indices=(starts[:,:,None]+np.arange(block)[None,None,:])%n
    means=diff[indices.reshape(4999,-1)[:,:n]].mean(axis=1)
    # Null-centered bootstrap, with finite-replicate correction.
    p=float((1+np.sum(means-diff.mean()>=diff.mean()))/5000)
    return {'ci95':np.quantile(means,[.025,.975]).tolist(),'p_raw':p,'block_origins':block,
            'effective_blocks':n/block}


def summarize(rows,h):
    scored=[r for r in rows if r['selection_scores']]
    policy=metrics(scored,'policy');baseline=metrics(scored,'Naive')
    if not scored:return {'state':'Insuficiente','rows':rows}
    differences=[abs(r['predictions']['Naive']-r['actual'])-abs(r['policy']-r['actual']) for r in scored]
    block=max(1,int(np.ceil(h/30)))
    comparison=bootstrap(differences,block);comparison['sensitivity']=bootstrap(differences,block*2)
    comparison.update(relative_gain=1-policy['mae']/baseline['mae'] if baseline['mae'] else 0,
                      wins=sum(d>0 for d in differences),ties=sum(d==0 for d in differences))
    coverage={}
    for label in ('80','95'):
        valid=[r for r in scored if r['interval'+label] is not None]
        coverage[label]={'n':len(valid),'coverage':float(np.mean([r['interval'+label][0]<=r['actual']<=r['interval'+label][1] for r in valid])) if valid else None,
                         'mean_width':float(np.mean([r['interval'+label][1]-r['interval'+label][0] for r in valid])) if valid else None}
    return {'state':'Retrospectivo','policy':policy,'baseline':baseline,'comparison':comparison,'coverage':coverage,
            'candidates':{m:metrics(scored,m) for m in MODELS},'rows':rows}
