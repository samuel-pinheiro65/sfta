import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { allResolved, capture, doneCount, supersetOf, validRecord, type Exercise, type Program, type RecordedSet, type Routine } from './model';
import { workoutRepository } from './repository';

export function useWorkout() {
  const [error, setError] = useState('');
  const data = useLiveQuery(async () => {
    try { return await workoutRepository.read(); }
    catch { return null; }
  }, []);
  const active = data?.active;
  async function run<T>(action: () => Promise<T>) {
    setError('');
    try { return await action(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar neste aparelho.');
      return undefined;
    }
  }
  const change = (edit: Parameters<typeof workoutRepository.change>[1]) =>
    run(() => active ? workoutRepository.change(active.id, edit) : Promise.reject(new Error('Abra uma sessão primeiro.')));
  return {
    data, active, error,
    start: (routine?: Routine) => run(() => workoutRepository.start(routine)),
    save: (program: Program) => run(async () => { await workoutRepository.saveProgram(program); return true; }),
    install: (program: Program, replace: boolean) => run(async () => {
      await workoutRepository.installProgram(program, replace);
      return true;
    }),
    add: (exercise: Exercise) => change(session => { session.exercises.push(capture(exercise)); }),
    move: (exerciseId: string, direction: -1 | 1) => change(session => {
      const from = session.exercises.findIndex(item => item.id === exerciseId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= session.exercises.length) return;
      [session.exercises[from], session.exercises[to]] = [session.exercises[to], session.exercises[from]];
    }),
    remove: (exerciseId: string) => change(session => {
      const exercise = session.exercises.find(item => item.id === exerciseId);
      if (exercise?.records.some(record => record.done)) throw new Error('Desfaça as séries concluídas antes de remover o exercício.');
      session.exercises = session.exercises.filter(item => item.id !== exerciseId);
    }),
    pause: () => change(session => {
      if (session.pausedAt) {
        session.pausedMs = (session.pausedMs ?? 0) + Date.now() - session.pausedAt;
        delete session.pausedAt;
      } else {
        session.pausedAt = Date.now();
        delete session.rest;
      }
    }),
    note: (exerciseId: string, text: string) => change(session => {
      const exercise = session.exercises.find(item => item.id === exerciseId);
      if (exercise) exercise.note = text;
    }),
    skipWarmup: (exerciseId: string, index: number) => change(session => {
      const exercise = session.exercises.find(item => item.id === exerciseId);
      if (!exercise?.sets[index]?.warmup || exercise.records[index].done) return;
      exercise.records[index].skipped = !exercise.records[index].skipped;
    }),
    record: (exerciseId: string, index: number, draft: RecordedSet, done: boolean) => change(session => {
      const exercise = session.exercises.find(item => item.id === exerciseId);
      if (!exercise) return;
      if (session.pausedAt && done) throw new Error('Retome o treino antes de concluir séries.');
      if (done && !validRecord(draft, exercise.sets[index].seconds ? 'bodyweight' : exercise.mode)) throw new Error('Informe carga e repetições válidas. O RPE é inteiro de 1 a 10.');
      const wasDone = exercise.records[index].done;
      exercise.records[index] = { ...draft, done, skipped: false };
      const plan = exercise.sets[index];
      const group = !plan.warmup ? supersetOf(exercise) : undefined;
      const round = plan.round;
      const members = group ? session.exercises.filter(item => supersetOf(item) === group) : [];
      const roundComplete = members.every(item => item.sets.every((set, i) => set.warmup || set.round !== round || item.records[i].done));
      const partsComplete = plan.slot === undefined
        ? !plan.skipRest
        : exercise.sets.every((set, i) => set.slot !== plan.slot || exercise.records[i].done);
      const rest = members.at(-1)?.rest ?? exercise.rest;
      if (done && !wasDone && rest > 0 && partsComplete && roundComplete) {
        session.rest = { until: Date.now() + rest * 1000, duration: rest, label: group ? `Superset ${group} · rodada ${(round ?? 0) + 1}` : `${exercise.name} · série ${index + 1}`, exerciseId, setIndex: index };
      } else if (!done && session.rest?.exerciseId === exerciseId && session.rest.setIndex === index) {
        delete session.rest;
      }
    }),
    rest: (offset: number | null) => change(session => {
      if (!session.rest) return;
      if (offset === null) delete session.rest;
      else session.rest.until = Math.max(Date.now(), session.rest.until) + offset * 1000;
    }),
    finish: (countPartial = false) => run(async () => {
      if (!active) return;
      await workoutRepository.change(active.id, session => {
        if (!doneCount(session)) throw new Error('Conclua pelo menos uma série antes de finalizar.');
        session.state = 'finished';
        session.countsTowardProgram = Boolean(session.routineId && (allResolved(session) || countPartial));
        session.finished = session.pausedAt ?? Date.now();
        delete session.pausedAt;
        delete session.rest;
      });
      return active.id;
    }),
    discard: () => run(async () => {
      if (!active) return false;
      await workoutRepository.discard(active.id);
      return true;
    }),
  };
}
export type WorkoutVM = ReturnType<typeof useWorkout>;
