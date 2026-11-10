import { useState } from 'react';
import catalog from './catalog.json';
import type { Exercise } from './model';

export function Catalog({ onChoose }: { onChoose: (patch: Partial<Exercise>) => void }) {
  const [query, setQuery] = useState('');
  const term = query.toLowerCase().trim();
  const results = term ? catalog.filter(item => [item.name, item.equipment, item.category, ...item.muscles].join(' ').toLowerCase().includes(term)).slice(0, 12) : [];
  return <details className="field-group"><summary>Buscar no catálogo</summary>
    <label>Nome, músculo ou equipamento<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {term && !results.length && <p>Sem resultados. Preencha o exercício manualmente.</p>}
    <div className="stack">{results.map(item => <button key={item.id} type="button" className="list-item" onClick={() => {
      const mode = item.equipment === 'dumbbell' ? 'dumbbell' : item.equipment === 'barbell' || item.equipment === 'e-z curl bar' ? 'plates' : item.equipment === 'body only' ? 'bodyweight' : 'external';
      onChoose({ name: item.name, mode }); setQuery('');
    }}><b>{item.name}</b><span>{[item.equipment, item.category, ...item.muscles].filter(Boolean).join(' · ')}</span></button>)}</div>
  </details>;
}
