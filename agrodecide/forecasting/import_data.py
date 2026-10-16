"""Explicit import of official dated CSV/XLSX files; never runs on page load."""
from pathlib import Path
import argparse
import pandas as pd
from .data import import_vintages
from agrodecide.v4.storage import read


def run(path):
    path=Path(path)
    data=pd.read_excel(path) if path.suffix.lower() in {'.xls','.xlsx'} else pd.read_csv(path)
    if 'tipo_registro' not in data or not data.tipo_registro.astype(str).str.strip().str.lower().eq('observado').all():
        raise ValueError('Solo tipo_registro=observado; separar proyecciones, DEMO y revisiones sin trazabilidad')
    if 'variable' not in data:raise ValueError('Falta variable')
    weather=data.variable.astype(str).str.lower().str.contains('lluvia|precipit|temperatura|helada',regex=True)
    if weather.any():
        if 'estacion' not in data or data.loc[weather,'estacion'].isna().any():raise ValueError('La serie meteorológica requiere código de estación')
        if 'unidad' not in data or not data.loc[weather,'unidad'].isin(['mm','°C','C','dias']).all():raise ValueError('Unidad meteorológica no soportada; documentar conversión antes de importar')
    prior=read('external_vintages')
    combined=pd.concat([prior,data],ignore_index=True) if not prior.empty else data.copy()
    if 'region' not in combined:combined['region']=None
    # The internal as-of identity is variable/region/methodology. Refuse files
    # that would silently pool station, variety, market or incompatible units.
    if 'metodologia' in combined:
        for _,part in combined.groupby(['variable','region','metodologia'],dropna=False):
            for column in ['unidad','estacion','producto','variedad','mercado_id']:
                if column in part and part[column].dropna().nunique()>1:
                    raise ValueError('Identidad ambigua en '+column+': usar un nombre de variable distinto por estación, variedad y mercado; no promediar sin una regla verificada')
    imported=import_vintages(path)
    print(f'Vintages oficiales conservados: {len(imported)}. Ejecutar evaluación y publicación antes de mostrarlos en la aplicación.')
    return imported


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('file',type=Path);args=parser.parse_args();run(args.file)
