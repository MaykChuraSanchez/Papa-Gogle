import React from 'react';
import {ArrowRight, Sprout} from 'lucide-react';
import type {ViewTab} from '../types/agro';

// Documentary photographs supplied by the owner. No identity or location is inferred.
export function FieldStories({navigate}: {navigate: (view: ViewTab) => void}) {
  return <section className="field-stories" aria-labelledby="field-stories-title">
    <div className="field-stories-heading"><div><span className="eyebrow">EL CAMPO, EN PRIMER PLANO</span><h2 id="field-stories-title">Detrás de cada cosecha<br/>hay mucho más que un precio.</h2></div><p>Trabajo, tiempo y decisiones. La información del mercado es una herramienta más para planificar con perspectiva.</p></div>
    <div className="field-stories-grid">
      <figure className="field-photo field-photo-landscape" data-presentation="field-landscape">
        <div className="field-photo-frame"><img src="/images/campo-cosecha-960.webp" srcSet="/images/campo-cosecha-480.webp 480w, /images/campo-cosecha-960.webp 960w" sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1100px) 58vw, 740px" width="960" height="720" loading="lazy" decoding="async" alt="Dos adultos trabajan la tierra con herramientas manuales en una ladera cultivada, con montañas al fondo."/><span className="field-photo-label"><Sprout size={14}/>Una mirada al trabajo de la tierra</span></div>
        <figcaption>Fotografía proporcionada por el propietario y autorizada para esta plataforma. Lugar y fecha no documentados.</figcaption>
      </figure>
      <figure className="field-photo field-photo-portrait" data-presentation="field-portrait" data-delay="60">
        <div className="field-photo-frame"><img src="/images/productora-andina-872.webp" srcSet="/images/productora-andina-480.webp 480w, /images/productora-andina-872.webp 872w" sizes="(max-width: 760px) calc(100vw - 64px), (max-width: 1100px) 35vw, 420px" width="872" height="957" loading="lazy" decoding="async" alt="Una mujer adulta sentada en el campo junto a tubérculos cosechados, con montañas al fondo."/><span className="field-photo-label">El valor de una campaña</span></div>
        <figcaption>Fotografía proporcionada por el propietario y autorizada para esta plataforma. Lugar y fecha no documentados.</figcaption>
      </figure>
    </div>
    <div className="field-stories-note"><p>Tu parcela tiene su propia historia. Añade tus fechas, rendimiento y costos para explorar un escenario que tenga contexto.</p><button className="text-button" onClick={() => navigate('planting')}>Preparar mi escenario<ArrowRight size={16}/></button></div>
  </section>;
}
