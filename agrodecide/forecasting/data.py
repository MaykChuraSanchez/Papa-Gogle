"""Master data audit, explicit units, vintages and calendar contracts."""
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import json
import numpy as np
import pandas as pd
from agrodecide.v4.storage import DATA, now, read, replace, atomic_json

VERSION='2.0.0'

@dataclass(frozen=True)
class MarketCalendar:
    weekdays: tuple=(0,1,2,3,4,5,6)
    closed: tuple=()
    def dates(self, origin, horizon, mode='calendar'):
        if mode not in {'calendar','market'} or horizon<1:raise ValueError('Calendario/horizonte inválido')
        values=[];day=pd.Timestamp(origin)
        while len(values)<horizon:
            day+=pd.Timedelta(days=1)
            if mode=='calendar' or (day.dayofweek in self.weekdays and str(day.date()) not in self.closed):values.append(day)
        return pd.DatetimeIndex(values)

def master(prices):
    x=prices.copy()
    keys=['fecha','variedad','mercado_id']
    if x.duplicated(keys).any():raise ValueError('Duplicados en fuente/variedad/mercado; no promediar')
    if not (x.producto=='Papa').all() or not (x.nivel=='mayorista').all():raise ValueError('Producto o nivel mezclado')
    if not (x.precio_s_kg>0).all():raise ValueError('Precio no positivo')
    if (x.volumen_t.dropna()<0).any():raise ValueError('Volumen negativo')
    x['fecha_observacion']=pd.to_datetime(x.fecha)
    x['fecha_publicacion']=pd.NaT
    x['fecha_disponibilidad']=pd.NaT
    x['availability_basis']='Fecha histórica de publicación no informada por SISAP; quote-date backtest condicionado a no revisión'
    x['producto']='Papa';x['region_procedencia']=None
    x['precio']=x.precio_s_kg;x['volumen']=x.volumen_t
    x['unidad_precio']='PEN/kg';x['unidad_volumen']='t'
    x['estado_validacion']='VALIDADO_ESQUEMA_UNIDAD';x['fecha_actualizacion']=now().isoformat()
    return x

def audit(prices):
    cleaned=master(prices);reports=[]
    for (variety,market),x in cleaned.groupby(['variedad','mercado_id']):
        x=x.sort_values('fecha');dates=pd.DatetimeIndex(x.fecha);full=pd.date_range(dates.min(),dates.max())
        p=x.set_index('fecha').precio_s_kg;returns=p.pct_change(fill_method=None);med=returns.median();mad=(returns-med).abs().median()
        flag=returns[(returns-med).abs()>max(.15,6*float(mad or .01))]
        reports.append({'variety':variety,'market_id':market,'rows':len(x),'start':str(dates.min().date()),'end':str(dates.max().date()),
            'missing_dates':[str(d.date()) for d in full.difference(dates)],'duplicates':int(x.duplicated(['fecha','variedad','mercado_id']).sum()),
            'null_volume':int(x.volumen_t.isna().sum()),'zero_volume':int((x.volumen_t==0).sum()),
            'weekday_counts':{str(k):int(v) for k,v in x.fecha.dt.dayofweek.value_counts().sort_index().items()},
            'outliers_flagged_not_removed':[{'date':str(d.date()),'change':float(v)} for d,v in flag.items()],
            'publication_dates_known':0,'unit':'PEN/kg','volume_unit':'t'})
    result={'at':now().isoformat(),'version':VERSION,'series':reports,'rows':len(cleaned),
            'data_hash':sha256(prices.sort_values(['variedad','fecha']).to_csv(index=False).encode()).hexdigest(),
            'price_vintage_caveat':'Precios históricos actuales de SISAP, sin vintages de revisión ni publicación por observación. Evaluación quote-date, no verificación de un archivo point-in-time completo.',
            'outlier_policy':'Se señalan cambios extremos; no se eliminan ni winsorizan precios reales.',
            'calendar':'Días calendario: hay observaciones los siete días de la semana. Ausencias se conservan como ausencias, no ceros.'}
    atomic_json(DATA/'forecasting'/'quality.json',result);replace('master_prices',cleaned)
    return result

def import_vintages(path):
    """Strict official CSV/XLSX contract; unknown publication times are not invented.

    The import is additive by vintage identity. Nonofficial/synthetic rows are refused.
    """
    path=Path(path)
    x=pd.read_excel(path) if path.suffix.lower() in {'.xlsx','.xls'} else pd.read_csv(path)
    required={'variable','periodo_observacion','valor','unidad','fuente','source_url','fecha_publicacion','fecha_disponibilidad','metodologia','tipo_registro'}
    if not required.issubset(x.columns):raise ValueError('Faltan columnas: '+', '.join(sorted(required-set(x.columns))))
    if x.empty:raise ValueError('Importación vacía')
    from urllib.parse import urlparse
    for value in x.source_url:
        host=urlparse(str(value)).hostname or ''
        if not any(host==d or host.endswith('.'+d) for d in ['gob.pe','bcrp.gob.pe','noaa.gov','emmsa.com.pe']):raise ValueError('Fuente no oficial')
    for col in ['periodo_observacion','fecha_publicacion','fecha_disponibilidad']:
        x[col]=pd.to_datetime(x[col],errors='raise')
        if x[col].isna().any():raise ValueError('Fecha desconocida: conservar aparte; no es un vintage elegible')
    if (x.fecha_disponibilidad<x.fecha_publicacion).any():raise ValueError('Disponibilidad anterior a publicación')
    if (x.periodo_observacion>x.fecha_disponibilidad).any():raise ValueError('Proyección futura no es observación')
    if x.tipo_registro.isin(['demo','sintetico','pronostico']).any():raise ValueError('Se requiere una observación oficial')
    x['valor']=pd.to_numeric(x.valor,errors='raise')
    if not np.isfinite(x.valor).all():raise ValueError('Valor no finito')
    price=x.variable.str.lower().isin(['precio','precio_mayorista'])
    if price.any():
        if not x.loc[price,'unidad'].eq('PEN/kg').all() or not x.loc[price,'valor'].between(.00001,100).all():raise ValueError('Precio debe ser positivo y expresado en PEN/kg; convertir con factor documentado')
    weather=x.variable.str.lower().str.contains('lluvia|precipit|temperatura|helada',regex=True)
    if weather.any() and ('region' not in x or x.loc[weather,'region'].isna().any()):raise ValueError('Clima requiere región y estación identificadas')
    ocean=x.variable.str.lower().str.contains('icen|roni|oni|nino|tsm',regex=True)
    if ocean.any() and ('region' not in x or x.loc[ocean,'region'].isna().any()):raise ValueError('Índice oceánico requiere región, sin mezclar Niño 1+2 y 3.4')
    volume=x.variable.str.lower().str.contains('volumen',regex=False)
    if volume.any():
        if not {'producto','variedad','mercado_id'}.issubset(x.columns):raise ValueError('Volumen requiere producto, variedad y mercado')
        if not x.loc[volume,'producto'].eq('Papa').all() or x.loc[volume,'variedad'].isna().any() or x.loc[volume,'mercado_id'].isna().any():raise ValueError('Identidad agrícola incompleta')
        if not x.loc[volume,'unidad'].eq('t').all() or (x.loc[volume,'valor']<0).any():raise ValueError('Volumen no negativo en toneladas')
    if 'region' not in x:x['region']=None
    # Region and methodology are part of identity; no joining Niño 1+2 and Niño 3.4.
    x['vintage_eligible']=True;x['archivo_origen']=path.name;x['sha256']=sha256(path.read_bytes()).hexdigest();x['fecha_actualizacion']=now().isoformat()
    prior=read('external_vintages');x=pd.concat([prior,x],ignore_index=True) if not prior.empty else x
    x=x.drop_duplicates(['variable','region','metodologia','periodo_observacion','fecha_disponibilidad','fuente'],keep='last')
    replace('external_vintages',x)
    return x

def asof_series(vintages,variable,dates,methodology=None):
    """Only eligible rows released by the origin; revision time governs selection."""
    if vintages.empty:return pd.Series(np.nan,index=dates,dtype=float)
    x=vintages[(vintages.variable==variable)&vintages.vintage_eligible.eq(True)].copy()
    if methodology is not None:x=x[x.metodologia==methodology]
    elif x.metodologia.nunique()>1:raise ValueError('Separar versiones metodológicas explícitamente')
    if 'region' in x and x.region.dropna().nunique()>1:raise ValueError('Separar regiones del indicador')
    if x.empty:return pd.Series(np.nan,index=dates,dtype=float)
    x['fecha_disponibilidad']=pd.to_datetime(x.fecha_disponibilidad);x['periodo_observacion']=pd.to_datetime(x.periodo_observacion)
    out=[]
    for date in dates:
        known=x[(x.fecha_disponibilidad<=date)&(x.periodo_observacion<=date)]
        # Latest observed period; latest available vintage for that period.
        known=known.sort_values(['periodo_observacion','fecha_disponibilidad'])
        out.append(float(known.valor.iloc[-1]) if len(known) else np.nan)
    return pd.Series(out,index=dates,dtype=float)
