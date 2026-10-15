import { EnfenAlertInfo } from '../types/agro';

export const OFFICIAL_ENFEN_DATA: EnfenAlertInfo = {
  status: 'VIGILANCIA DE EL NIÑO COSTERO',
  ensoGlobalStatus: 'Condición Neutra',
  latestBulletinNumber: 'COMUNICADO OFICIAL ENFEN N° 14-2026',
  bulletinDate: '10 de Octubre de 2026',
  seaSurfaceTempAnomaly: 0.6, // +0.6 °C en Región Niño 1+2
  pacificCentralAnomaly: 0.2, // +0.2 °C en Región Niño 3.4
  officialSummary:
    'La Comisión Multisectorial ENFEN mantiene el estado de "Vigilancia de El Niño Costero". En la región Niño 1+2 se prevén condiciones neutras a cálidas débiles durante la primavera 2026 e inicios de verano 2027. Para el Pacífico central (Niño 3.4) la probabilidad de condición neutra es del 62%. En los valles andinos paperos, se monitorea la normalización del régimen de lluvias estacionales.',
  probabilities: {
    neutro: 62,
    ninoDebil: 24,
    ninoModerado: 10,
    nina: 4,
  },
  impactOnPotato: {
    coast:
      'Costa Central y Norte (Barranca, Cañete, Chancay): Temperaturas nocturnas sobre lo normal pueden inducir brotamiento vegetativo y dificultar la tuberización óptima. Aumento moderado de presión de plagas (mosca minadora y polilla).',
    centralHighlands:
      'Sierra Central (Tarma, Jauja, Huancayo, Huánuco): El inicio de siembras en secano (octubre-noviembre) requiere seguimiento de veranillos. Si las lluvias se regularizan en diciembre, el rendimiento promedio se mantendrá en 22-26 t/ha.',
    southernHighlands:
      'Sierra Sur y Altiplano (Puno, Cusco, Apurímac): Históricamente, eventos cálidos en el Pacífico se asocian a déficit hídrico temporal en Puno y meseta del Collao. Riesgo moderado en parcelas de secano.',
    priceShockMultiplier: 1.08, // Ajuste moderado de +8% en precio mayorista GMML por prima de riesgo climático
  },
  officialUrl: 'https://www.gob.pe/institucion/imarpe/colecciones/1070-comunicados-oficiales-del-enfen',
};

export type EnfenScenarioType = 'neutral' | 'vigilancia' | 'nino_debil' | 'nino_moderado_fuerte';

export function calculateEnfenClimateAdjustment(
  basePrice: number,
  baseYieldTonHa: number,
  region: 'Costa' | 'Sierra' | 'Sierra_Sur',
  enfenScenario: EnfenScenarioType = 'vigilancia'
) {
  let yieldMultiplier = 1.0;
  let priceMultiplier = 1.0;
  let riskNote = '';

  switch (enfenScenario) {
    case 'neutral':
      yieldMultiplier = 1.0;
      priceMultiplier = 1.0;
      riskNote = 'Condición oceánica neutra. Rendimientos y precios siguen estrictamente su curva estacional histórica de GMML.';
      break;

    case 'vigilancia':
      if (region === 'Costa') {
        yieldMultiplier = 0.95;
        priceMultiplier = 1.06;
        riskNote = 'Vigilancia ENFEN: Noches ligeramente templadas en valles costeños. Merma estimada de 5% en tuberización.';
      } else if (region === 'Sierra_Sur') {
        yieldMultiplier = 0.92;
        priceMultiplier = 1.08;
        riskNote = 'Vigilancia ENFEN: Posible inicio tardío de lluvias en el sur andino (Puno/Cusco). Ligera prima alcista.';
      } else {
        yieldMultiplier = 0.98;
        priceMultiplier = 1.05;
        riskNote = 'Sierra Central (Junín/Huánuco): Régimen de lluvias dentro de rangos normales de primavera. Impacto leve.';
      }
      break;

    case 'nino_debil':
      if (region === 'Costa') {
        yieldMultiplier = 0.85;
        priceMultiplier = 1.15;
        riskNote = 'El Niño Débil: Temperaturas altas frenan calibre de tubérculos en Cañete/Barranca. Presión alcista en Lima.';
      } else if (region === 'Sierra_Sur') {
        yieldMultiplier = 0.82;
        priceMultiplier = 1.20;
        riskNote = 'El Niño Débil: Déficit hídrico en época de siembra andina reduce oferta de papa nativa y Huayro.';
      } else {
        yieldMultiplier = 0.90;
        priceMultiplier = 1.14;
        riskNote = 'Sierra Central: Veranillos intermitentes retrasan cosechas en Tarma y Jauja, elevando el precio mayorista.';
      }
      break;

    case 'nino_moderado_fuerte':
      if (region === 'Costa') {
        yieldMultiplier = 0.68;
        priceMultiplier = 1.35;
        riskNote = 'El Niño Moderado/Fuerte: Lluvias en quebradas costeñas y plagas intensas reducen rendimientos hasta 32%. Alza severa de precios.';
      } else if (region === 'Sierra_Sur') {
        yieldMultiplier = 0.70;
        priceMultiplier = 1.40;
        riskNote = 'El Niño Moderado/Fuerte: Sequía en el altiplano (Puno) genera escasez general de tubérculo y semillas.';
      } else {
        yieldMultiplier = 0.80;
        priceMultiplier = 1.30;
        riskNote = 'Sierra Central: Deslizamientos en Carretera Central encarecen fletes camioneros y restringen el ingreso al GMML.';
      }
      break;
  }

  const adjustedPrice = Number((basePrice * priceMultiplier).toFixed(2));
  const adjustedYield = Number((baseYieldTonHa * yieldMultiplier).toFixed(1));

  return {
    scenario: enfenScenario,
    adjustedPrice,
    adjustedYield,
    priceDeltaPct: Number(((priceMultiplier - 1) * 100).toFixed(1)),
    yieldDeltaPct: Number(((yieldMultiplier - 1) * 100).toFixed(1)),
    riskNote,
  };
}
