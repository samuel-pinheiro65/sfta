import { useState } from 'react';
import { Catalog } from './Catalog';
import { id, newExercise, type Exercise, type Program, type Week } from './model';

export function ExerciseFields({ value, onChange }: { value: Exercise; onChange: (value: Exercise) => void }) {
  return <fieldset className="field-group">
    <Catalog onChoose={patch => onChange({ ...value, ...patch })} />
    <label>Exercício<input required value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></label>
    <label>Tipo de carga<select value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value as Exercise['mode'] })}>
      <option value="external">Peso externo</option><option value="plates">Anilhas, soma dos dois lados</option>
      <option value="dumbbell">Peso por halter</option><option value="bodyweight">Peso corporal</option>
    </select></label>
    <label>Descanso em segundos<input type="number" required min={0} max={3600} value={value.rest} onChange={e => onChange({ ...value, rest: e.target.valueAsNumber || 0 })} /></label>
    <label>Grupo de superset<input maxLength={12} placeholder="Ex.: A" value={value.superset ?? ''} onChange={e => onChange({ ...value, superset: e.target.value.toUpperCase() || undefined })} /></label>
    {value.sets.map((set, i) => {
      const update = (patch: Partial<typeof set>) => onChange({ ...value, sets: value.sets.map((s, j) => j === i ? { ...s, ...patch } : s) });
      return <fieldset key={i} className="field-group"><legend>Série {i + 1}</legend>
        <label className="check"><input type="checkbox" checked={set.warmup} onChange={e => update({ warmup: e.target.checked })} />Aquecimento</label>
        <div className="metrics">
          {value.mode !== 'bodyweight' && <label>Meta kg<input type="number" min={0} step="any" value={set.kg ?? ''} onChange={e => update({ kg: e.target.value === '' ? null : e.target.valueAsNumber })} /></label>}
          <label>Meta reps<input type="number" min={1} required value={set.reps} onChange={e => update({ reps: e.target.valueAsNumber || 1, target: undefined })} /></label>
          <label>Meta RPE<input type="number" min={1} max={10} value={set.rpe ?? ''} onChange={e => update({ rpe: e.target.valueAsNumber || undefined, rpeTarget: undefined })} /></label>
        </div>
        {(set.target || set.rpeTarget) && <p>Prescrição: {set.target ?? set.reps} · RPE {set.rpeTarget ?? set.rpe ?? '—'}</p>}
        <label className="check"><input type="checkbox" checked={!!set.unilateral} onChange={e => update({ unilateral: e.target.checked })} />Registrar por lado</label>
        <label>Tempo em segundos<input type="number" min={1} max={36000} value={set.seconds ?? ''} onChange={e => update({ seconds: e.target.valueAsNumber || undefined })} /></label>
        <label>Etapas da série (reps separadas por vírgula)<input defaultValue={set.stages?.join(',') ?? ''} onBlur={e => {
          const text = e.target.value.trim();
          if (!text) update({ stages: undefined });
          else if (/^\\d+(?:,\\s*\\d+)*$/.test(text)) update({ stages: text.split(',').map(Number) });
        }} /></label>
        {value.sets.length > 1 && <button type="button" className="text-button" onClick={() => onChange({ ...value, sets: value.sets.filter((_, j) => i !== j) })}>Remover série</button>}
      </fieldset>;
    })}
    <button type="button" className="secondary" onClick={() => onChange({ ...value, sets: [...value.sets, { ...value.sets.at(-1)! }] })}>Adicionar série</button>
  </fieldset>;
}
const newRoutine = () => ({ id: id(), name: '', exercises: [newExercise()] });
const newWeek = (n: number): Week => ({ id: id(), name: `Semana ${n}`, routines: [newRoutine()] });
export function ProgramEditor({ initial, onSave, onCancel }: { initial?: Program; onSave: (program: Program) => Promise<unknown>; onCancel: () => void }) {
  const [program, setProgram] = useState<Program>(() => initial ?? { id: id(), name: '', weeks: [newWeek(1)] });
  const [saving, setSaving] = useState(false);
  const editWeek = (i: number, week: Week) => setProgram({ ...program, weeks: program.weeks.map((w, j) => i === j ? week : w) });
  return <form className="stack" onSubmit={async e => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave(program);
    setSaving(false);
  }}>
    <label>Nome do programa<input required pattern=".*\S.*" value={program.name} onChange={e => setProgram({ ...program, name: e.target.value })} /></label>
    {program.weeks.map((week, i) => <section key={week.id} className="card stack">
      <label>Semana<input required value={week.name} onChange={e => editWeek(i, { ...week, name: e.target.value })} /></label>
      {week.routines.map((routine, j) => {
        const editRoutine = (patch: Partial<typeof routine>) => editWeek(i, { ...week, routines: week.routines.map((r, k) => k === j ? { ...r, ...patch } : r) });
        return <fieldset key={routine.id} className="field-group"><legend>Rotina {j + 1}</legend>
          <label>Nome da rotina<input required value={routine.name} onChange={e => editRoutine({ name: e.target.value })} /></label>
          {routine.exercises.map((exercise, k) => <ExerciseFields key={exercise.id} value={exercise} onChange={value => editRoutine({ exercises: routine.exercises.map((x, l) => k === l ? value : x) })} />)}
          <button type="button" className="secondary" onClick={() => editRoutine({ exercises: [...routine.exercises, newExercise()] })}>Adicionar exercício</button>
        </fieldset>;
      })}
      <button type="button" className="secondary" onClick={() => editWeek(i, { ...week, routines: [...week.routines, newRoutine()] })}>Adicionar rotina</button>
    </section>)}
    <button type="button" className="secondary" onClick={() => setProgram({ ...program, weeks: [...program.weeks, newWeek(program.weeks.length + 1)] })}>Adicionar semana</button>
    <button className="primary" disabled={saving}>Salvar programa</button>
    <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
  </form>;
}
