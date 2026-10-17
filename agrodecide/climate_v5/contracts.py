"""Small dependency-free validation contract for climate evidence.

This module never adjusts a price forecast. An institutional climate outlook is
not an observation, and a regional agricultural hypothesis is not a price model.
"""
from datetime import date
from math import isfinite
from typing import Literal, TypedDict
from urllib.parse import urlparse
import re

EvidenceKind = Literal['observation', 'institutional_forecast', 'agricultural_hypothesis', 'economic_simulation']
KINDS = {'observation', 'institutional_forecast', 'agricultural_hypothesis', 'economic_simulation'}
ALLOWED_HOSTS = {'enfen.imarpe.gob.pe', 'www.senamhi.gob.pe', 'www.cpc.ncep.noaa.gov',
                 'cpc.ncep.noaa.gov', 'met.igp.gob.pe', 'siofen.imarpe.gob.pe'}


class Source(TypedDict):
    institution: str
    title: str
    url: str
    download_url: str | None
    sha256: str
    retrieved_at: str


def iso_day(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def evidence_status(row: dict, as_of: str) -> str:
    """Status derives from explicit dates; unknown issue dates stay unknown."""
    day = iso_day(as_of)
    if iso_day(row['available_at']) > day:
        return 'not_yet_available'
    if row.get('issue_date') and iso_day(row['issue_date']) > day:
        return 'not_yet_available'
    if row.get('valid_to') and iso_day(row['valid_to']) < day:
        return 'expired' if row['kind'] == 'institutional_forecast' else 'historical'
    if row.get('next_update') and iso_day(row['next_update']) < day:
        return 'update_due'
    return 'current_context'


def asof_evidence(rows: list[dict], origin: str) -> list[dict]:
    """No backdating: only evidence first recovered/published by this origin."""
    return [r for r in rows if evidence_status(r, origin) != 'not_yet_available']


def validate_catalog(catalog: dict) -> None:
    iso_day(catalog['as_of'])
    ids = set()
    for row in catalog['evidence']:
        if row['id'] in ids:
            raise ValueError('Identificador climático duplicado')
        ids.add(row['id'])
        if row['kind'] not in KINDS:
            raise ValueError('Tipo de evidencia desconocido')
        iso_day(row['available_at'])
        for field in ['issue_date', 'valid_from', 'valid_to', 'next_update']:
            iso_day(row.get(field))
        if row.get('issue_date') and row['available_at'] < row['issue_date']:
            raise ValueError('Disponibilidad anterior a emisión')
        if row.get('valid_from') and row.get('valid_to') and row['valid_from'] > row['valid_to']:
            raise ValueError('Vigencia invertida')
        if row['model_eligible']:
            raise ValueError('Este catálogo de contexto no autoriza features retrospectivas')
        if row['kind'] == 'observation' and row.get('valid_to') and row['valid_to'] > catalog['as_of']:
            raise ValueError('Observación realizada en el futuro')
        if row.get('risk_scope') == 'parcel' and not row.get('parcel_evidence'):
            raise ValueError('No hay evidencia para alerta de parcela')
        source = row['source']
        if urlparse(source['url']).hostname not in ALLOWED_HOSTS:
            raise ValueError('Fuente fuera del catálogo oficial')
        if not re.fullmatch('[a-f0-9]{64}', source['sha256']):
            raise ValueError('Original sin SHA-256')
        if not source['retrieved_at']:
            raise ValueError('Original sin fecha de recuperación')
        if row['status'] != evidence_status(row, catalog['as_of']):
            raise ValueError('Etiqueta de vigencia inconsistente')
    for indicator in catalog['indicators']:
        if indicator['evidence_id'] not in ids:
            raise ValueError('Indicador sin evidencia')
        if indicator['value'] is not None and not isfinite(indicator['value']):
            raise ValueError('Indicador no finito')
        if indicator['quantity'] == 'sst_anomaly' and indicator['unit'] != '°C de anomalía':
            raise ValueError('Anomalía y temperatura absoluta no intercambiables')
    for scenario in catalog['regional_scenarios']:
        if scenario['kind'] != 'agricultural_hypothesis':
            raise ValueError('Escenario agrícola mal clasificado')
        if scenario['price_effect'] is not None or scenario['probability'] is not None:
            raise ValueError('Sin coeficientes/precios/probabilidades fabricados')
        if scenario['price_simulation_enabled']:
            raise ValueError('Impacto de precio regional todavía no estimado')
        if any(ref not in ids for ref in scenario['evidence_ids']):
            raise ValueError('Escenario sin fuente verificable')
    for comparison in catalog.get('event_comparisons',[]):
        if comparison['model_eligible']:
            raise ValueError('Comparador histórico descriptivo sin vintages')
        for event in comparison['events']:
            for point in event['points']:
                if point['period']>catalog['as_of'] and point['value'] is not None:
                    raise ValueError('Comparador contiene una observación futura')
                if point['value'] is not None and not isfinite(point['value']):
                    raise ValueError('Índice histórico no finito')
