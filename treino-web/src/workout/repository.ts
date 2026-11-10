import Dexie, { type EntityTable } from 'dexie';
import { capture, id, type Program, type Routine, type Session } from './model';

const db = new Dexie('treino-local') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  programs: EntityTable<Program, 'id'>;
};
export type Backup = { schemaVersion: 1; programs: Program[]; sessions: Session[] };
db.version(1).stores({ sessions: 'id,state,finished', programs: 'id' });

export const workoutRepository = {
  async read() {
    return db.transaction('r', db.sessions, db.programs, async () => ({
      active: await db.sessions.where('state').equals('active').first(),
      history: await db.sessions.orderBy('finished').reverse().toArray(),
      programs: await db.programs.toArray(),
    }));
  },
  async start(routine?: Routine) {
    return db.transaction('rw', db.sessions, async () => {
      const active = await db.sessions.where('state').equals('active').first();
      if (active) return active.id;
      const session: Session = {
        id: id(), name: routine?.name ?? 'Treino livre', routineId: routine?.id,
        started: Date.now(), state: 'active', exercises: routine?.exercises.map(capture) ?? [],
      };
      await db.sessions.add(session);
      return session.id;
    });
  },
  async change(sessionId: string, edit: (session: Session) => void) {
    return db.transaction('rw', db.sessions, async () => {
      const session = await db.sessions.get(sessionId);
      if (session?.state !== 'active') throw new Error('Esta sessão já foi encerrada.');
      edit(session);
      await db.sessions.put(session);
      return true;
    });
  },
  async discard(sessionId: string) {
    await db.transaction('rw', db.sessions, async () => {
      if ((await db.sessions.get(sessionId))?.state === 'active') await db.sessions.delete(sessionId);
    });
  },
  async saveProgram(program: Program) {
    await db.programs.put(program);
  },
  async installProgram(program: Program, replace: boolean) {
    await db.transaction('rw', db.programs, async () => {
      if (!replace && await db.programs.get(program.id)) {
        throw new Error('O programa já está instalado. Confirme a substituição para atualizar.');
      }
      await db.programs.put(program);
    });
  },
  async backup(): Promise<Backup> {
    return db.transaction('r', db.sessions, db.programs, async () => ({
      schemaVersion: 1, programs: await db.programs.toArray(), sessions: await db.sessions.toArray(),
    }));
  },
  async restore(snapshot: Backup) {
    await db.transaction('rw', db.sessions, db.programs, async () => {
      if (await db.sessions.count() || await db.programs.count()) {
        throw new Error('Restaure em um navegador sem treinos ou programas locais.');
      }
      await db.programs.bulkAdd(snapshot.programs);
      await db.sessions.bulkAdd(snapshot.sessions);
    });
  },
};
