"""Small univariate challengers with explicit log backtransformation and tuning."""
from dataclasses import dataclass
import numpy as np
import pandas as pd

WINDOWS = (365, 540, 730, 1095, None)
MODELS = ('Naive', 'AR1 log · ventana validada', 'Media 28 días', 'EWM 0.1', 'Random walk con drift')


def prepared(y, minimum=90):
    if not isinstance(y.index, pd.DatetimeIndex) or y.index.has_duplicates:
        raise ValueError('Índice diario único requerido')
    if len(y) < minimum or not np.isfinite(y.iloc[-1]) or (y.dropna() <= 0).any():
        raise ValueError('Historia insuficiente o precio no positivo/último ausente')
    x = y.asfreq('D').ffill(limit=7)
    if x.isna().any():
        raise ValueError('Hueco de precio superior a 7 días; no se interpola')
    return x


def ar1(y, horizon, window=None):
    """OLS phi around training mean log level; forecasts arithmetic mean, not median.

    The innovation variance correction is conditional on the fitted Gaussian AR(1).
    Prediction intervals are subsequently calibrated from separate observed errors.
    Unstable estimates are refused, never silently clipped into stationarity.
    """
    if horizon < 1 or horizon > 240:
        raise ValueError('Horizonte calendario 1–240')
    x = prepared(y, 365)
    if window is not None:
        if len(x) < window:
            raise ValueError('Ventana solicitada no disponible')
        x = x.iloc[-window:]
    z = np.log(x.to_numpy(float)); mu = float(z.mean())
    a, b = z[:-1]-mu, z[1:]-mu
    denom = float(a @ a)
    phi = float((a @ b)/denom) if denom > 1e-14 else 0.
    if not np.isfinite(phi) or abs(phi) >= 1:
        raise ValueError('AR(1) no estable: |phi| >= 1')
    residual = b-phi*a
    sigma2 = float(np.sum(residual**2)/max(len(residual)-1, 1))
    leads = np.arange(1, horizon+1)
    conditional_log_mean = mu + phi**leads*(z[-1]-mu)
    variance = sigma2*(1-phi**(2*leads))/(1-phi**2)
    median = np.exp(conditional_log_mean)
    mean = np.exp(conditional_log_mean+.5*variance)
    if not np.isfinite(mean).all() or (mean > 100).any():
        raise ValueError('AR(1) fuera del contrato de precios')
    return mean, {'window_days': window or 'expanding', 'observations': len(z),
                  'mu_log': mu, 'equilibrium_geometric_price': float(np.exp(mu)),
                  'phi': phi, 'innovation_variance': sigma2,
                  'half_life_days': float(np.log(.5)/np.log(phi)) if 0 < phi < 1 else None,
                  'backtransformation': 'Media lognormal condicional exp(m + var/2); no mediana',
                  'conditional_median_endpoint': float(median[-1]),
                  'training_end': str(y.index[-1].date())}


def inner_origins(y, horizon):
    # All target dates end on/before the outer origin; monthly spacing is tuning only.
    last = len(y)-horizon-1
    cuts=[]
    for intended in (last-60,last-30,last):
        # A grid date without an actual quote is not an eligible issuance origin.
        # Move backwards only; target values never determine the replacement date.
        for i in range(intended,max(363,intended-8),-1):
            if np.isfinite(y.iloc[i]):
                if i not in cuts:cuts.append(i)
                break
    return cuts


def tune_ar1(y, horizon):
    results = []; cuts = inner_origins(y, horizon)
    if len(cuts) < 3:
        raise ValueError('Menos de tres orígenes internos disponibles')
    for window in WINDOWS:
        loss = []; failures = []
        for cut in cuts:
            train = y.iloc[:cut+1]; target = y.iloc[cut+1:cut+horizon+1].to_numpy(float)
            try:
                pred, _ = ar1(train, horizon, window)
                valid = np.isfinite(target)
                if valid.sum() < .8*horizon:
                    raise ValueError('Cobertura interna <80%')
                loss.append(float(np.abs(pred[valid]-target[valid]).mean()))
            except ValueError as exc:
                failures.append(str(exc))
        results.append({'window_days': window or 'expanding', 'mae': float(np.mean(loss)) if len(loss)==3 else None,
                        'completed_origins': len(loss), 'failures': sorted(set(failures))})
    eligible = [r for r in results if r['mae'] is not None]
    if not eligible:
        raise ValueError('Ninguna ventana AR(1) estable con tres validaciones internas')
    winner = min(eligible, key=lambda r: (r['mae'], str(r['window_days'])))
    window = None if winner['window_days']=='expanding' else winner['window_days']
    pred, meta = ar1(y, horizon, window)
    meta.update({'internal_validation': results,
                 'internal_origins': [str(y.index[i].date()) for i in cuts],
                 'internal_latest_target': str(y.index[cuts[-1]+horizon].date()),
                 'tuning_scope': 'Sólo precios anteriores o iguales al origen externo; pérdida de trayectoria diaria'})
    return pred, meta


def predict(name, y, horizon):
    x = prepared(y)
    if name == 'AR1 log · ventana validada':
        return tune_ar1(y, horizon)
    if name == 'Naive':
        p = np.repeat(x.iloc[-1], horizon)
    elif name == 'Media 28 días':
        p = np.repeat(x.iloc[-28:].mean(), horizon)
    elif name == 'EWM 0.1':
        p = np.repeat(x.ewm(alpha=.1, adjust=False).mean().iloc[-1], horizon)
    elif name == 'Random walk con drift':
        z = np.log(x.iloc[-365:].to_numpy()); drift = float(np.diff(z).mean())
        p = np.exp(z[-1]+np.arange(1,horizon+1)*drift)
    else:
        raise ValueError('Modelo no registrado')
    if not np.isfinite(p).all() or (p<=0).any() or (p>100).any():
        raise ValueError('Predicción fuera de contrato')
    return p, {'training_end': str(y.index[-1].date()), 'features': ['precio_s_kg'],
               'future_covariates': False}
