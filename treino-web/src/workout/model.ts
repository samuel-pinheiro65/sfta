export type LoadMode = 'plates' | 'dumbbell' | 'external' | 'bodyweight';
export type SetPlan = {
  warmup: boolean; kg: number | null; reps: number; rpe?: number;
  target?: string; rpeTarget?: string; seconds?: number;
  stages?: number[]; unilateral?: boolean; failure?: boolean;
  part?: string; continuation?: boolean; skipRest?: boolean; round?: number; slot?: number;
};
export type Exercise = { id: string; name: string; mode: LoadMode; rest: number; sets: SetPlan[]; instructions?: string; superset?: string };
export type Routine = { id: string; name: string; exercises: Exercise[] };
export type Week = { id: string; name: string; routines: Routine[] };
export type Program = { id: string; name: string; weeks: Week[] };
export type RecordedSet = { kg: string; reps: string; rpe: string; note: string; done: boolean; failure?: boolean; skipped?: boolean };
export type SessionExercise = Exercise & { note: string; records: RecordedSet[] };
export type Session = {
  id: string; name: string; started: number; finished?: number;
  state: 'active' | 'finished'; routineId?: string; pausedAt?: number; pausedMs?: number; countsTowardProgram?: boolean;
  exercises: SessionExercise[]; rest?: { until: number; duration: number; label: string; exerciseId: string; setIndex: number };
};
export const id = () => crypto.randomUUID();
export const supersetOf = (exercise: Exercise) => exercise.superset || /^([A-Z])[1-9]\d*[.:]/.exec(exercise.name)?.[1];
export function elapsed(session: Session, now = Date.now()) {
  return Math.max(0, (session.finished ?? session.pausedAt ?? now) - session.started - (session.pausedMs ?? 0));
}
export const newExercise = (): Exercise => ({
  id: id(), name: '', mode: 'external', rest: 90, sets: [{ warmup: false, kg: 0, reps: 8, rpe: 8 }],
});
export function capture(exercise: Exercise): SessionExercise {
  const sets = exercise.sets.flatMap((plan, index) => {
    const sides = plan.unilateral ? ['E', 'D'] : [''];
    const stages = plan.stages?.length ? plan.stages : [plan.reps];
    const parts = sides.flatMap(side => stages.map((reps, stage) => ({
      ...plan, reps, slot: index, round: exercise.sets.slice(0, index).filter(set => !set.warmup).length,
      target: stages.length > 1 ? String(reps) : plan.target,
      part: side + (stages.length > 1 ? `.${stage + 1}` : ''),
    })));
    return parts.map((part, position) => ({
      ...part, continuation: position > 0, skipRest: position < parts.length - 1,
    }));
  });
  return {
    ...exercise, sets, note: '',
    records: sets.map(() => ({ kg: '', reps: '', rpe: '', note: '', done: false })),
  };
}
export function validRecord(record: RecordedSet, mode: LoadMode) {
  const weight = record.kg.replace(',', '.');
  return (mode === 'bodyweight' || (/^\d+(\.\d+)?$/.test(weight) && Number.isFinite(Number(weight))))
    && /^\d+$/.test(record.reps) && Number.isSafeInteger(Number(record.reps))
    && (record.rpe === '' || /^(?:[1-9]|10)$/.test(record.rpe));
}
export const doneCount = (session: Session) => session.exercises.reduce(
  (sum, exercise) => sum + exercise.records.filter(record => record.done).length, 0,
);
export const allResolved = (session: Session) => session.exercises.every(exercise =>
  exercise.records.every(record => record.done || record.skipped),
);
export function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(seconds / 60), seconds % 60].map(part => String(part).padStart(2, '0')).join(':');
}
export function formatWorkout(session: Session) {
  return session.exercises.flatMap(exercise => {
    let warmup = 0;
    let work = 0;
    let previous: boolean | undefined;
    let number = 0;
    let newGroup = true;
    const lines: string[] = [];
    exercise.records.forEach((record, index) => {
      const plan = exercise.sets[index];
      if (!plan.continuation) newGroup = true;
      if (!record.done) return;
      if (previous !== undefined && previous !== plan.warmup) lines.push('');
      previous = plan.warmup;
      const weight = Number(record.kg.replace(',', '.'));
      const kg = `${String(weight).replace('.', ',')}kg`;
      const load = exercise.mode === 'plates' ? (weight === 0 ? 'bar' : `${kg} + bar`)
        : exercise.mode === 'bodyweight' ? 'peso corporal' : kg;
      const rpe = record.rpe ? ` rpe ${record.rpe}` : plan.warmup || plan.seconds ? '' : ' rpe não informado';
      if (newGroup) { number = plan.warmup ? ++warmup : ++work; newGroup = false; }
      const effort = plan.seconds ? `${Number(record.reps)}s` : `${Number(record.reps)}reps (${load})`;
      lines.push(`${number}${plan.part ?? ''}- ${effort}${plan.warmup ? ' warmup' : ''}${rpe}${record.failure ? ' falha' : ''}${note(record.note)}`);
    });
    return lines.length ? [[exercise.name + note(exercise.note), ...lines].join('\n')] : [];
  }).join('\n\n');
}
function note(value: string) {
  const cleaned = value.trim().replace(/[\r\n]+/g, ' ');
  return cleaned ? ` (${cleaned})` : '';
}
