import type { Program } from './model';
import type { Backup } from './repository';

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const optionalText = (value: unknown, max: number) => value === undefined || text(value, max);
const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function list(value: unknown, max: number, check: (item: unknown) => boolean) {
  return Array.isArray(value) && value.length > 0 && value.length <= max && value.every(check);
}

function isProgram(input: unknown): input is Program {
  const ids = new Set<unknown>();
  function named(value: unknown): value is Record<string, unknown> {
    if (!object(value) || !text(value.id, 100) || !text(value.name, 300) || ids.has(value.id)) return false;
    ids.add(value.id);
    return true;
  }
  return named(input) &&
    list(input.weeks, 30, week => named(week) &&
      list(week.routines, 14, routine => named(routine) &&
        list(routine.exercises, 30, exercise => named(exercise) &&
          ['plates', 'external', 'dumbbell', 'bodyweight'].includes(String(exercise.mode)) &&
          integer(exercise.rest, 0, 3600) && optionalText(exercise.instructions, 3000) &&
          list(exercise.sets, 40, set => object(set) &&
            typeof set.warmup === 'boolean' && integer(set.reps, 1, 999) &&
            (set.kg === null || (typeof set.kg === 'number' && Number.isFinite(set.kg) && set.kg >= 0)) &&
            optionalText(set.target, 80) && optionalText(set.rpeTarget, 40) &&
            (set.seconds === undefined || integer(set.seconds, 1, 36000)) &&
            (set.stages === undefined || list(set.stages, 8, reps => integer(reps, 1, 999))) &&
            (set.unilateral === undefined || typeof set.unilateral === 'boolean')
          )
        )
      )
    );
}

export function readPersonalProgram(input: unknown): Program {
  if (!isProgram(input) || input.id !== 'ppl-5x-personal-v1') throw new Error('O arquivo do programa inicial está inválido.');
  return input;
}

export function readBackup(input: unknown): Backup {
  const ids = new Set<string>();
  function unique(value: unknown): value is Record<string, unknown> {
    if (!object(value) || typeof value.id !== 'string' || !text(value.id, 100) || !text(value.name, 300) || ids.has(value.id)) return false;
    ids.add(value.id);
    return true;
  }
  const valid = object(input) && input.schemaVersion === 1 &&
    Array.isArray(input.programs) && input.programs.length <= 100 &&
    input.programs.every(program => isProgram(program) && unique(program)) &&
    Array.isArray(input.sessions) && input.sessions.length <= 5000 &&
    input.sessions.filter(session => object(session) && session.state === 'active').length <= 1 &&
    input.sessions.every(session => unique(session) &&
      integer(session.started, 1, 8640000000000000) &&
      (session.state === 'active' || (session.state === 'finished' && integer(session.finished, Number(session.started), 8640000000000000))) &&
      Array.isArray(session.exercises) && session.exercises.length <= 100 &&
      session.exercises.every(ex => object(ex) && text(ex.id, 100) && text(ex.name, 300) &&
        typeof ex.note === 'string' && integer(ex.rest, 0, 3600) &&
        ['plates', 'external', 'dumbbell', 'bodyweight'].includes(String(ex.mode)) &&
        Array.isArray(ex.sets) && ex.sets.every(set => object(set) && typeof set.warmup === 'boolean') &&
        Array.isArray(ex.records) && ex.records.length === ex.sets.length &&
        ex.records.every(record => object(record) && typeof record.done === 'boolean' &&
          ['kg', 'reps', 'rpe', 'note'].every(field => typeof record[field] === 'string')))
    );
  if (!valid) throw new Error('O arquivo de backup está inválido.');
  return input as Backup;
}
