import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiArchive, FiArrowRight, FiBriefcase, FiCheckCircle, FiPlus, FiUsers, FiX } from "react-icons/fi";
import { getSupabase } from "../../lib/supabase";
import type { ProjectMembership } from "../../types/workspace";
import "./Projects.css";

interface ProjectsProps {
  memberships: ProjectMembership[];
  organizationId: string;
  activeProjectId: string;
  canCreate: boolean;
  onSelect: (projectId: string) => void;
  onCreated: (projectId: string) => void;
}

interface ProjectMetric { tasks: number; completed: number; members: number }

export function Projects({ memberships, organizationId, activeProjectId, canCreate, onSelect, onCreated }: ProjectsProps) {
  const [metrics, setMetrics] = useState<Record<string, ProjectMetric>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#d71920");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const projectIds = useMemo(() => memberships.map((item) => item.projectId), [memberships]);

  useEffect(() => {
    if (projectIds.length === 0) return;
    let cancelled = false;
    async function loadMetrics() {
      const client = getSupabase();
      const [tasksResult, membersResult] = await Promise.all([
        client.from("tasks").select("project_id, status").in("project_id", projectIds),
        client.from("project_members").select("project_id").in("project_id", projectIds),
      ]);
      if (cancelled || tasksResult.error || membersResult.error) return;
      const next: Record<string, ProjectMetric> = {};
      projectIds.forEach((id) => { next[id] = { tasks: 0, completed: 0, members: 0 }; });
      (tasksResult.data ?? []).forEach((task) => {
        next[task.project_id].tasks += 1;
        if (task.status === "done") next[task.project_id].completed += 1;
      });
      (membersResult.data ?? []).forEach((member) => { next[member.project_id].members += 1; });
      setMetrics(next);
    }
    void loadMetrics();
    return () => { cancelled = true; };
  }, [projectIds]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const { data, error: createError } = await getSupabase().rpc("create_project", {
      p_organization_id: organizationId,
      p_name: name.trim(),
      p_description: description.trim(),
      p_color: color,
      p_icon: "briefcase",
    });
    setIsSaving(false);
    if (createError) { setError(createError.message); return; }
    setName(""); setDescription(""); setColor("#d71920"); setIsCreating(false);
    onCreated(data as string);
  }

  return (
    <section className="projects-view" aria-labelledby="projects-title">
      <header className="projects-view__header">
        <div><span>Portfólio</span><h2 id="projects-title">Projetos</h2><p>Escolha um contexto de trabalho sem misturar equipes, tarefas ou notificações.</p></div>
        {canCreate && <button type="button" onClick={() => setIsCreating(true)}><FiPlus /> Novo projeto</button>}
      </header>

      <div className="projects-view__grid">
        {memberships.map(({ project, role }) => {
          const metric = metrics[project.id] ?? { tasks: 0, completed: 0, members: 0 };
          const progress = metric.tasks ? Math.round((metric.completed / metric.tasks) * 100) : 0;
          return (
            <article key={project.id} className={`project-card${project.id === activeProjectId ? " project-card--active" : ""}`}>
              <div className="project-card__accent" style={{ background: project.color }} />
              <header><span style={{ color: project.color, background: `${project.color}18` }}><FiBriefcase /></span><small>{role === "owner" ? "Proprietário" : role === "admin" ? "Administrador" : "Membro"}</small></header>
              <h3>{project.name}</h3>
              <p>{project.description || "Projeto sem descrição."}</p>
              <div className="project-card__metrics"><span><FiCheckCircle /> {metric.completed}/{metric.tasks} tarefas</span><span><FiUsers /> {metric.members} membros</span></div>
              <div className="project-card__progress"><span style={{ width: `${progress}%`, background: project.color }} /></div>
              <footer><small>{project.status === "active" ? `${progress}% concluído` : <><FiArchive /> Inativo</>}</small><button type="button" disabled={project.status === "inactive"} onClick={() => onSelect(project.id)}>Abrir <FiArrowRight /></button></footer>
            </article>
          );
        })}
      </div>

      {isCreating && (
        <div className="project-dialog__overlay" onMouseDown={(event) => event.target === event.currentTarget && setIsCreating(false)}>
          <form className="project-dialog" onSubmit={createProject}>
            <header><div><span>Novo contexto</span><h2>Criar projeto</h2></div><button type="button" aria-label="Fechar" onClick={() => setIsCreating(false)}><FiX /></button></header>
            <label><span>Nome</span><input autoFocus required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label><span>Descrição</span><textarea maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label className="project-dialog__color"><span>Cor do projeto</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><code>{color}</code></label>
            {error && <p role="alert">{error}</p>}
            <footer><button type="button" onClick={() => setIsCreating(false)}>Cancelar</button><button disabled={isSaving}><FiPlus /> {isSaving ? "Criando..." : "Criar projeto"}</button></footer>
          </form>
        </div>
      )}
    </section>
  );
}
