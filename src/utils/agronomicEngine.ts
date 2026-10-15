import { VarietyInfo } from '../types/agro';

export const VARIETIES_CATALOG: VarietyInfo[] = [
  {
    id: 'canchan',
    name: 'Papa Canchán',
    commercialName: 'Canchán (Blanca / INIA 303)',
    type: 'blanca',
    cycleMinDays: 120,
    cycleMaxDays: 150,
    cycleAvgDays: 135,
    altitudeMin: 2200,
    altitudeMax: 3600,
    avgYield: 24.5,
    frostResistance: 'Media',
    blightResistance: 'Media',
    description: 'La variedad de papa blanca más comercializada en el Gran Mercado Mayorista de Lima (GMML). Alta demanda para consumo directo y pollerías.',
    source: 'INIA - Programa Nacional de Raíces y Tuberosas (Estación Santa Ana - Huancayo)'
  },
  {
    id: 'yungay',
    name: 'Papa Yungay',
    commercialName: 'Yungay (Blanca harinosa)',
    type: 'blanca',
    cycleMinDays: 150,
    cycleMaxDays: 180,
    cycleAvgDays: 165,
    altitudeMin: 2500,
    altitudeMax: 3800,
    avgYield: 22.0,
    frostResistance: 'Alta',
    blightResistance: 'Alta',
    description: 'Excelente para sopas, purés y frituras caseras. Ciclo más largo pero mayor tolerancia a heladas y altitudes elevadas en sierra central y sur.',
    source: 'INIA Perú / CIP'
  },
  {
    id: 'amarilla',
    name: 'Papa Amarilla Tumbay',
    commercialName: 'Amarilla Tumbay / Criolla',
    type: 'amarilla',
    cycleMinDays: 100,
    cycleMaxDays: 125,
    cycleAvgDays: 112,
    altitudeMin: 2800,
    altitudeMax: 3900,
    avgYield: 16.5,
    frostResistance: 'Baja',
    blightResistance: 'Baja',
    description: 'Textura arenosa de alta cotización en restaurantes y hogares. Menor rendimiento por hectárea pero precio mayorista históricamente superior en 60-110% sobre la blanca.',
    source: 'INIA Huánuco / Valle del Huallaga'
  },
  {
    id: 'huamantanga',
    name: 'Papa Huamantanga',
    commercialName: 'Huamantanga (Color suave)',
    type: 'color',
    cycleMinDays: 135,
    cycleMaxDays: 160,
    cycleAvgDays: 148,
    altitudeMin: 2900,
    altitudeMax: 3950,
    avgYield: 18.2,
    frostResistance: 'Media',
    blightResistance: 'Media',
    description: 'Papa de pulpa harinosa y cáscara bicolor. Muy apreciada en Lima metropolitana; producida intensamente en Huánuco, Junín y Pasco.',
    source: 'INIA Santa Ana'
  },
  {
    id: 'unica',
    name: 'Papa Única',
    commercialName: 'Única (INIA 306)',
    type: 'blanca',
    cycleMinDays: 110,
    cycleMaxDays: 130,
    cycleAvgDays: 120,
    altitudeMin: 1800,
    altitudeMax: 3400,
    avgYield: 28.0,
    frostResistance: 'Media',
    blightResistance: 'Alta',
    description: 'Variedad de alta precocidad y resistencia al virus del enrollamiento. Muy cultivada en valles costeros e interandinos de sierra baja.',
    source: 'INIA / CIP'
  }
];

export function getVarietyById(id: string): VarietyInfo {
  return VARIETIES_CATALOG.find((v) => v.id === id) || VARIETIES_CATALOG[0];
}

export function calculateHarvestWindow(plantingDateStr: string, varietyId: string) {
  const variety = getVarietyById(varietyId);
  const plantingDate = new Date(plantingDateStr);

  // If invalid date, fallback to now
  const baseTime = isNaN(plantingDate.getTime()) ? new Date().getTime() : plantingDate.getTime();

  const minHarvestTime = baseTime + variety.cycleMinDays * 24 * 60 * 60 * 1000;
  const maxHarvestTime = baseTime + variety.cycleMaxDays * 24 * 60 * 60 * 1000;
  const avgHarvestTime = baseTime + variety.cycleAvgDays * 24 * 60 * 60 * 1000;

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    variety,
    plantingDateStr,
    minHarvestDate: formatDate(new Date(minHarvestTime)),
    maxHarvestDate: formatDate(new Date(maxHarvestTime)),
    avgHarvestDate: formatDate(new Date(avgHarvestTime)),
    durationDays: variety.cycleAvgDays,
  };
}
