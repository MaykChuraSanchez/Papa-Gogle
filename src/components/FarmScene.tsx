import React, {useEffect, useRef, useState} from 'react';
import {Pause, Play} from 'lucide-react';

const stages = ['Siembra', 'Crecimiento', 'Cosecha'];
export function FarmScene() {
  const [stage, setStage] = useState(2), [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const motionAllowed = useRef(false);
  const frame = useRef<number | null>(null);
  const latest = useRef({x: 0, y: 0});
  useEffect(() => {
    const scene = root.current;
    if (!scene) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let visible = true;
    const reset = () => {if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; scene.style.setProperty('--scene-x', '0deg'); scene.style.setProperty('--scene-y', '0deg');};
    const update = () => {motionAllowed.current = visible && !paused && !preference.matches && pointer.matches && !document.hidden; scene.dataset.motion = motionAllowed.current ? 'active' : 'still'; if (!motionAllowed.current) reset();};
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {visible = entries[0]?.isIntersecting ?? false; update();}, {threshold: 0}) : null;
    observer?.observe(scene);
    preference.addEventListener('change', update); pointer.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    update();
    return () => {observer?.disconnect(); preference.removeEventListener('change', update); pointer.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); motionAllowed.current = false; reset();};
  }, [paused]);
  const resetTilt = () => {if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; root.current?.style.setProperty('--scene-x', '0deg'); root.current?.style.setProperty('--scene-y', '0deg');};
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!motionAllowed.current || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    latest.current = {x: Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)) * 4, y: Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) * -3};
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {root.current?.style.setProperty('--scene-x', `${latest.current.x}deg`); root.current?.style.setProperty('--scene-y', `${latest.current.y}deg`); frame.current = null;});
  };
  return <div ref={root} className={'farm-scene farm-scene-refined' + (paused ? ' scene-paused' : '')} aria-label="Ilustración tridimensional del ciclo de cultivo" onPointerMove={move} onPointerLeave={resetTilt}>
    <div className="scene-glow" aria-hidden="true"/><div className="farm-orbit orbit-one" aria-hidden="true"/><div className="farm-orbit orbit-two" aria-hidden="true"/>
    <div className="farm-island" aria-hidden="true"><div className="farm-soil"/><div className="farm-top">{Array.from({length: 25}, (_, n) => <div className="crop" key={n} style={{left: (n % 5) * 18 + 8 + '%', top: Math.floor(n / 5) * 18 + 8 + '%', transitionDelay: `${n * 9}ms`, transform: `scale(${stage === 0 ? .25 : stage === 1 ? .6 : 1})`}}><i/><b/><em/></div>)}</div><div className="soil-face soil-front"/><div className="soil-face soil-side"/></div>
    <div className="scene-chip chip-one"><span className="status-dot"/>Tu próxima campaña</div><div className="scene-chip chip-two"><strong>DATOS → DECISIONES</strong><span>Explora · simula · compara</span></div>
    <button className="scene-motion-control" aria-pressed={paused} aria-label={paused ? 'Activar profundidad al mover el cursor' : 'Pausar profundidad al mover el cursor'} onClick={() => {resetTilt(); setPaused(value => !value);}}>{paused ? <Play size={13}/> : <Pause size={13}/>}<span>{paused ? 'Vista fija' : 'Profundidad'}</span></button>
    <div className="scene-stages" role="group" aria-label="Etapa ilustrativa del cultivo">{stages.map((name, n) => <button key={name} aria-pressed={stage === n} onClick={() => setStage(n)}>{name}</button>)}</div>
    <p className="scene-caption"><span className="sr-only" aria-live="polite">Etapa: {stages[stage]}. </span>Ilustración del ciclo; no representa el estado de tu parcela.</p>
  </div>;
}
