import { useEffect, useState } from 'react';
import { Copy } from 'react-feather';
import { ProgramEditor } from './workout/Editor';
import { enableSound, playSound, SessionView } from './workout/SessionView';
import { allResolved, doneCount, elapsed, formatWorkout, id, type Program, type Routine, type Session } from './workout/model';
import { useWorkout } from './workout/useWorkout';
import { readPersonalProgram } from './workout/install';
import { BackupPanel } from './workout/BackupPanel';

const tabs = [
  ['Treinar', '◇'], ['Programas', '▤'], ['Histórico', '◷'], ['Perfil', '○'],
] as const;
type Tab = typeof tabs[number][0];
const themes = ['Escuro', 'Claro', 'Sistema'] as const;
const accents = ['Verde', 'Violeta', 'Azul'] as const;
type Theme = typeof themes[number];
type Accent = typeof accents[number];
function preference<T extends string>(key: string, values: readonly T[]) {
  try { return values.find(value => value === localStorage.getItem(key)) ?? values[0]; }
  catch { return values[0]; }
}

function Heading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return <header><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></header>;
}
function date(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(timestamp);
}
function duration(s: Session) {
  return Math.floor(elapsed(s) / 60000);
}
function routineDone(history: Session[], routineId: string) {
  return history.some(s => s.routineId === routineId && (s.countsTowardProgram ?? allResolved(s)));
}
function demo(): Program {
  return { id: id(), name: 'Programa de exemplo', weeks: [{
    id: id(), name: 'Semana 01', routines: [{
      id: id(), name: 'Lower B', exercises: [
        { id: id(), name: 'Squat', mode: 'plates', rest: 90, sets: [
          { warmup: true, kg: 20, reps: 8 }, { warmup: false, kg: 80, reps: 5, rpe: 8 },
        ] },
        { id: id(), name: 'Machine Crunch', mode: 'external', rest: 60, sets: [{ warmup: false, kg: 43, reps: 12, rpe: 8 }] },
      ],
    }],
  }] };
}
function Summary({ session, onClose }: { session: Session; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const text = formatWorkout(session);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Treino copiado.');
    } catch {
      setMessage('Selecione o texto abaixo para copiar manualmente.');
      const preview = document.getElementById('prompt-preview') as HTMLTextAreaElement | null;
      preview?.focus();
      preview?.select();
    }
  }
  return <>
    <Heading eyebrow="Sessão salva" title="Treino concluído" sub={session.name} />
    <section className="card stack">
      <div className="metrics">
        <div><strong>{duration(session)} min</strong><small>Duração</small></div>
        <div><strong>{session.exercises.length}</strong><small>Exercícios</small></div>
        <div><strong>{doneCount(session)}</strong><small>Séries</small></div>
      </div>
      <span className="badge success">Salvo neste aparelho</span>
    </section>
    <button className="primary" disabled={!text} onClick={() => void copy()}><Copy size={16} aria-hidden="true" />Copiar treino</button>
    {message && <p role="status">{message}</p>}
    <section className="card stack"><h2>Prévia do texto</h2><p>Copie e cole no chat que você usa.</p>
      <textarea id="prompt-preview" aria-label="Prévia do texto" className="prompt" readOnly value={text} rows={Math.max(4, Math.min(16, text.split('\n').length + 1))} />
      <p>Somente séries concluídas</p>
    </section>
    <button className="secondary" onClick={onClose}>Ir para o histórico</button>
  </>;
}

export function App() {
  const vm = useWorkout();
  const [tab, setTab] = useState<Tab>('Treinar');
  const [training, setTraining] = useState(false);
  const [editing, setEditing] = useState<Program | 'new'>();
  const [summary, setSummary] = useState<string>();
  const [setupMessage, setSetupMessage] = useState('');
  const [theme, setTheme] = useState(() => preference('treino.theme', themes));
  const [accent, setAccent] = useState(() => preference('treino.accent', accents));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
    try { localStorage.setItem('treino.theme', theme); localStorage.setItem('treino.accent', accent); }
    catch { /* Keep preferences for the current session. */ }
  }, [theme, accent]);
  const data = vm.data;
  const hasPersonalProgram = data?.programs.some(program => program.id === 'ppl-5x-personal-v1') ?? false;
  const viewed = data?.history.find(s => s.id === summary);
  const next = data?.programs.flatMap(program => program.weeks.map(week => ({
    program, week, routine: week.routines.find(r => !routineDone(data.history, r.id)),
  }))).find(entry => entry.routine);
  function navigate(nextTab: Tab) {
    setTab(nextTab); setTraining(false); setEditing(undefined); setSummary(undefined);
    window.scrollTo(0, 0);
  }
  async function start(routine?: Routine) {
    enableSound();
    if (await vm.start(routine)) { setTraining(true); window.scrollTo(0, 0); }
  }
  function openSummary(id: string) {
    setTraining(false); setSummary(id); window.scrollTo(0, 0);
  }
  let view;
  if (data === undefined) view = <p role="status">Abrindo seus treinos…</p>;
  else if (data === null) view = <p role="alert">O armazenamento deste navegador não está disponível. Reabra o app para tentar novamente.</p>;
  else if (viewed) view = <Summary key={viewed.id} session={viewed} onClose={() => navigate('Histórico')} />;
  else if (training && vm.active) view = <SessionView session={vm.active} vm={vm} onFinish={openSummary} onDiscard={() => navigate('Treinar')} />;
  else if (tab === 'Treinar') {
    const latest = data.history[0];
    const count = next?.week.routines.filter(r => routineDone(data.history, r.id)).length ?? 0;
    view = <>
      <Heading eyebrow="SFTA" title="Hora de treinar" sub={next ? `Programa ativo · ${next.program.name}` : 'Seus programas e sessões neste aparelho'} />
      {vm.active ? <section className="card stack"><span className="badge">Sessão em andamento</span><h2 className="hero-title">{vm.active.name}</h2><button className="primary" onClick={() => void start()}>Retomar treino</button></section>
        : <>
          {next && <section className="card stack"><span className="badge">{next.week.name}</span><h2 className="hero-title">{next.routine?.name}</h2>
            <p>{next.routine?.exercises.length} exercícios · {next.routine?.exercises.flatMap(e => e.sets).filter(s => !s.warmup).length} séries de trabalho</p>
            <progress aria-label="Progresso da semana" value={count} max={next.week.routines.length} />
            <p>{count} de {next.week.routines.length} treinos concluídos</p><span className="badge success">Disponível offline</span>
          </section>}
          {next ? <button className="primary" onClick={() => void start(next.routine)}>Iniciar {next.routine?.name}</button>
            : <button className="primary" onClick={() => { navigate('Programas'); setEditing('new'); }}>Criar programa</button>}
          <button className="secondary" onClick={() => void start()}>Treino livre</button>
        </>}
      {latest && <section className="card stack"><small>Última sessão</small><button className="list-item" onClick={() => openSummary(latest.id)}><b>{latest.name}</b><span>{date(latest.finished!)} · {duration(latest)} min · {doneCount(latest)} séries</span></button></section>}
    </>;
  } else if (tab === 'Programas') view = <>
    <Heading eyebrow="Programas" title={editing === 'new' ? 'Criar programa' : editing ? 'Editar programa' : 'Seus programas'} sub="Monte semanas, rotinas e metas." />
    {editing ? <ProgramEditor initial={editing === 'new' ? undefined : editing} onCancel={() => setEditing(undefined)} onSave={async p => { if (await vm.save(p)) setEditing(undefined); }} /> : <>
      {data.programs.map(program => <section className="card stack" key={program.id}><h2>{program.name}</h2>
        {program.weeks.map(week => <section className="stack" key={week.id}><span className="badge">{week.name}</span>
          {week.routines.map(routine => <button key={routine.id} className="list-item" onClick={() => void start(routine)}>
            <b>{routine.name}</b><span>{routineDone(data.history, routine.id) ? 'Concluído · repetir treino' : `${routine.exercises.length} exercícios`}</span>
          </button>)}
        </section>)}
        <button className="secondary" onClick={() => setEditing(program)}>Editar programa</button>
      </section>)}
      <button className="primary" onClick={() => setEditing('new')}>Criar programa</button>
      {!data.programs.length && <button className="secondary" onClick={() => void vm.save(demo())}>Carregar programa de exemplo</button>}
    </>}
  </>;
  else if (tab === 'Histórico') view = <>
    <Heading eyebrow="Sessões salvas" title="Histórico" sub="Consulte seus treinos e copie o registro." />
    <section className="card stack">{data.history.length ? data.history.map(session =>
      <button className="list-item" key={session.id} onClick={() => openSummary(session.id)}><b>{session.name}</b><span>{date(session.finished!)} · {duration(session)} min · {doneCount(session)} séries</span></button>
    ) : <p>Seus treinos finalizados aparecem aqui.</p>}</section>
  </>;
  else view = <>
    <Heading eyebrow="Preferências" title="Seu treino, seu ritmo" sub="Treinos salvos neste aparelho." />
    <section className="card stack"><h2>Aparência</h2>
      <label>Tema<select value={theme} onChange={event => setTheme(event.target.value as Theme)}>{themes.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Cor de destaque<select value={accent} onChange={event => setAccent(event.target.value as Accent)}>{accents.map(value => <option key={value}>{value}</option>)}</select></label>
    </section>
    <section className="card stack"><h2>Descanso</h2><p>O som toca com a sessão aberta.</p><button className="secondary" onClick={() => {
      enableSound(); window.setTimeout(playSound, 100);
    }}>Testar som</button></section>
    <section className="card stack"><h2>Treinos offline</h2><p>{data.programs.length} programas neste aparelho</p></section>
    <details className="card">
      <summary>{hasPersonalProgram ? 'Atualizar programa inicial' : 'Configurar programa inicial'}</summary>
      <p>Selecione o arquivo pessoal preparado a partir do seu programa.</p>
      <label>Arquivo do programa<input type="file" accept=".json,application/json" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        setSetupMessage('');
        try {
          if (file.size > 1024 * 1024) throw new Error('O arquivo deve ter até 1 MB.');
          const program = readPersonalProgram(JSON.parse(await file.text()));
          const replace = data.programs.some(item => item.id === program.id);
          if (replace && !window.confirm('Substituir as rotinas e metas deste programa? Suas edições no programa serão substituídas. O histórico e a sessão em andamento serão preservados.')) return;
          if (await vm.install(program, replace)) {
            setSetupMessage(replace ? 'Programa inicial atualizado.' : 'Programa inicial disponível em Programas.');
          }
        } catch (error) { setSetupMessage(error instanceof Error ? error.message : 'Não foi possível ler o programa.'); }
      }} /></label>
    </details>
    {setupMessage && <p role="status">{setupMessage}</p>}
    <BackupPanel />
  </>;

  return <div className="app">
    <main className="content stack">{vm.error && <p className="error" role="alert">{vm.error}</p>}{view}</main>
    <footer>
      {vm.active && !training && <button className="resume" onClick={() => void start()}>{vm.active.name} · Retomar</button>}
      <nav aria-label="Navegação principal">{tabs.map(([name, icon]) =>
        <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => navigate(name)}><span aria-hidden="true">{icon}</span>{name}</button>
      )}</nav>
    </footer>
  </div>;
}
