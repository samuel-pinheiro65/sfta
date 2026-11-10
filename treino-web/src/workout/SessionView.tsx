import { useEffect, useRef, useState } from 'react';
import { Check } from 'react-feather';
import { allResolved, clock, doneCount, elapsed, newExercise, supersetOf, type RecordedSet, type Session, type SessionExercise } from './model';
import { ExerciseFields } from './Editor';
import type { WorkoutVM } from './useWorkout';

let context: AudioContext | undefined;
export function enableSound() {
  try { context ??= new AudioContext(); void context.resume().catch(() => {}); } catch { /* visual timer remains available */ }
}
export function playSound() {
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.value = 0.09;
  oscillator.frequency.value = 740;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.22);
}
function SetCard({ exercise, index, vm }: { exercise: SessionExercise; index: number; vm: WorkoutVM }) {
  const saved = exercise.records[index];
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setDraft(saved); }, [saved]);
  const plan = exercise.sets[index];
  if (saved.skipped) return <section className="set-card actions">
    <span>Aquecimento {index + 1} pulado</span><button className="text-button" onClick={() => void vm.skipWarmup(exercise.id, index)}>Reativar</button>
  </section>;
  const fields = [
    ...(exercise.mode === 'bodyweight' || plan.seconds ? [] : [{ key: 'kg' as const, label: 'Carga', goal: plan.kg == null ? 'A escolher' : `${plan.kg} kg` }]),
    { key: 'reps' as const, label: plan.seconds ? 'Tempo (s)' : 'Repetições', goal: plan.seconds ? String(plan.seconds) : plan.target ?? String(plan.reps) },
    { key: 'rpe' as const, label: 'RPE', goal: plan.rpeTarget ?? plan.rpe?.toString() ?? '—' },
  ];
  const set = (patch: Partial<RecordedSet>) => { dirty.current = true; setDraft(value => ({ ...value, ...patch })); };
  const save = async (done: boolean) => {
    setSaving(true);
    if (await vm.record(exercise.id, index, draft, done)) dirty.current = false;
    setSaving(false);
  };
  return <section className="set-card stack">
    <strong>{plan.warmup ? 'Aquecimento' : 'Série de trabalho'} {index + 1}{plan.part ? ` · ${plan.part}` : ''}</strong>
    <div className="series-grid muted"><span>Métrica</span><span>Meta</span><span>Realizado</span></div>
    {fields.map(({ key, label, goal }) => <label className="series-grid" key={key}>
      <span>{label}</span><span className="muted">{goal}</span>
      <input aria-label={`${label} realizado`} inputMode={key === 'kg' ? 'decimal' : 'numeric'}
        value={draft[key]} disabled={saved.done || saving} onChange={e => set({ [key]: e.target.value })} />
    </label>)}
    <label>Observação da série<input maxLength={2000} value={draft.note} disabled={saved.done || saving} onChange={e => set({ note: e.target.value })} /></label>
    {!plan.warmup && !plan.seconds && <label className="check"><input type="checkbox" checked={!!draft.failure} disabled={saved.done || saving} onChange={e => set({ failure: e.target.checked })} />Cheguei à falha</label>}
    <div className="actions">
      {saved.done ? <><span className="done"><Check size={14} aria-hidden="true" /> Série concluída</span><button className="text-button" disabled={saving} onClick={() => void save(false)}>Desfazer</button></>
        : <><button className="secondary" disabled={saving || !dirty.current} onClick={() => void save(false)}>Salvar rascunho</button>
          <button className="primary" disabled={saving} onClick={() => { enableSound(); void save(true); }}>Concluir série</button>
          {plan.warmup && <button className="text-button" disabled={saving} onClick={() => void vm.skipWarmup(exercise.id, index)}>Pular aquecimento</button>}</>}
    </div>
  </section>;
}

export function SessionView({ session, vm, onFinish, onDiscard }: {
  session: Session; vm: WorkoutVM; onFinish: (id: string) => void; onDiscard: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const [exercise, setExercise] = useState<ReturnType<typeof newExercise> | null>(null);
  const [ending, setEnding] = useState(false);
  const [countPartial, setCountPartial] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const deadline = session.rest?.until;
  useEffect(() => {
    if (!deadline || deadline <= Date.now()) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - deadline < 1000) playSound();
    }, deadline - Date.now());
    return () => clearTimeout(timer);
  }, [deadline]);
  const remaining = deadline ? Math.max(0, deadline - now) : 0;
  const partial = !allResolved(session);

  return <>
    <header><div className="eyebrow">{session.pausedAt ? 'Treino pausado' : 'Treino em andamento'}</div><h1>{session.name}</h1><p>{clock(elapsed(session, now))} · Sessão neste aparelho</p></header>
    <button className="secondary" onClick={() => void vm.pause()}>{session.pausedAt ? 'Continuar treino' : 'Pausar treino'}</button>
    <section className="card stack">
      <div className="timer"><strong>{clock(remaining)}</strong><div><b>Descanso</b><p>{session.rest?.label ?? 'Começa ao concluir uma série'}</p></div></div>
      <progress aria-label="Tempo de descanso restante" value={remaining / 1000} max={session.rest?.duration ?? 1} />
      <div className="actions">
        <button className="secondary" disabled={!remaining} onClick={() => void vm.rest(-30)}>−30 s</button>
        <button className="secondary" disabled={!remaining} onClick={() => void vm.rest(30)}>+30 s</button>
        <button className="secondary" disabled={!remaining} onClick={() => void vm.rest(null)}>Pular</button>
      </div>
    </section>
    {session.exercises.map((ex, i) => <section className="card stack" key={ex.id}>
      <div className="title-row"><h2>{ex.name}</h2><span className="badge">{i + 1} / {session.exercises.length}</span></div>
      {supersetOf(ex) && <span className="badge">Superset {supersetOf(ex)}</span>}
      <p>{({ plates: 'Anilhas · soma dos dois lados', dumbbell: 'Peso por halter', external: 'Peso externo', bodyweight: 'Peso corporal' })[ex.mode]}</p>
      {ex.instructions && <details><summary>Orientações do programa</summary><p style={{ whiteSpace: 'pre-line' }}>{ex.instructions}</p></details>}
      <label>Observação do exercício<input defaultValue={ex.note} maxLength={2000} onBlur={e => { if (e.target.value !== ex.note) void vm.note(ex.id, e.target.value); }} /></label>
      {ex.sets.map((_, index) => <SetCard key={index} exercise={ex} index={index} vm={vm} />)}
      <div className="actions">
        <button className="secondary" disabled={i === 0} onClick={() => void vm.move(ex.id, -1)}>Subir</button>
        <button className="secondary" disabled={i + 1 === session.exercises.length} onClick={() => void vm.move(ex.id, 1)}>Descer</button>
        <button className="text-button" disabled={ex.records.some(record => record.done)} onClick={() => void vm.remove(ex.id)}>Remover</button>
      </div>
    </section>)}
    {exercise ? <form className="card stack" onSubmit={async e => { e.preventDefault(); if (await vm.add(exercise)) setExercise(null); }}>
      <ExerciseFields value={exercise} onChange={setExercise} />
      <button className="primary">Salvar exercício</button>
      <button type="button" className="secondary" onClick={() => setExercise(null)}>Cancelar</button>
    </form> : <button className="secondary" onClick={() => setExercise(newExercise())}>Adicionar exercício</button>}
    {partial && session.routineId && doneCount(session) > 0 && <label className="check">
      <input type="checkbox" checked={countPartial} onChange={event => setCountPartial(event.target.checked)} /> Contar este treino parcial no programa
    </label>}
    <button className="primary" disabled={ending || !doneCount(session)} onClick={async () => {
      if (partial && !window.confirm('Há séries pendentes. Finalizar somente com as séries concluídas?')) return;
      setEnding(true);
      const id = await vm.finish(countPartial);
      if (id) onFinish(id);
      setEnding(false);
    }}>Finalizar treino</button>
    <button className="text-button" onClick={async () => {
      if (window.confirm('Descartar esta sessão?') && await vm.discard()) onDiscard();
    }}>Descartar sessão</button>
  </>;
}
