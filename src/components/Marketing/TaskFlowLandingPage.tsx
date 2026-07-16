import { useEffect } from "react";
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiColumns,
  FiGrid,
  FiLock,
  FiMessageCircle,
  FiMessageSquare,
  FiPaperclip,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { TASKFLOW_PATHS } from "../../utils/routes";
import "./TaskFlowLandingPage.css";

const whatsappUrl = "https://wa.me/5516988191995?text=Ol%C3%A1%2C%20quero%20conhecer%20melhor%20o%20TaskFlow.";
const productImage = "https://crtechweb.com.br/projects/taskflow.webp";

const features = [
  {
    icon: FiGrid,
    title: "Gestão multiempresa",
    description: "Separe empresas, equipes, setores e usuários com dados protegidos em cada ambiente.",
  },
  {
    icon: FiUserCheck,
    title: "Permissões por perfil",
    description: "Proprietários e administradores gerenciam a operação; membros visualizam apenas o que foi atribuído.",
  },
  {
    icon: FiColumns,
    title: "Quadro Kanban",
    description: "Organize backlog, tarefas planejadas, atividades em andamento e entregas concluídas.",
  },
  {
    icon: FiMessageSquare,
    title: "Colaboração centralizada",
    description: "Comentários, histórico e contexto permanecem registrados dentro de cada tarefa.",
  },
  {
    icon: FiPaperclip,
    title: "Anexos privados",
    description: "Compartilhe documentos, imagens e planilhas com controle de acesso e links temporários.",
  },
  {
    icon: FiBarChart2,
    title: "Dashboard gerencial",
    description: "Acompanhe atrasos, produtividade, carga por responsável e desempenho por equipe.",
  },
];

const useCases = [
  {
    number: "01",
    title: "Operações e projetos",
    description: "Transforme demandas espalhadas em um fluxo claro, com responsáveis e prazos definidos.",
  },
  {
    number: "02",
    title: "Equipes administrativas",
    description: "Organize atividades de financeiro, compras, RH, comercial e demais setores da empresa.",
  },
  {
    number: "03",
    title: "Prestadores de serviço",
    description: "Separe clientes ou empresas e acompanhe as entregas de cada operação com segurança.",
  },
];

const faqs = [
  {
    question: "O TaskFlow funciona para mais de uma empresa?",
    answer: "Sim. O sistema foi estruturado como uma plataforma multiempresa, mantendo membros, equipes e tarefas separados por organização.",
  },
  {
    question: "Um colaborador consegue visualizar tarefas de outras pessoas?",
    answer: "Por padrão, membros visualizam apenas tarefas atribuídas a eles. Proprietários e administradores possuem a visão gerencial da empresa.",
  },
  {
    question: "É possível organizar departamentos e equipes?",
    answer: "Sim. Cada empresa pode criar equipes ou setores e vincular usuários conforme a sua estrutura interna.",
  },
  {
    question: "A C.R TECH oferece implantação e personalização?",
    answer: "Sim. Podemos apoiar a configuração inicial, estrutura de equipes, identidade visual e evolução de funcionalidades conforme a necessidade do negócio.",
  },
];

export function TaskFlowLandingPage() {
  useEffect(() => {
    document.title = "TaskFlow | Gestão de tarefas para empresas";

    const description = "TaskFlow é a plataforma da C.R TECH para organizar empresas, equipes, tarefas, prazos, colaboração e indicadores gerenciais.";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "index, follow, max-image-preview:large";

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://crtechweb.com.br/taskflow";
  }, []);

  return (
    <div className="taskflow-marketing">
      <header className="taskflow-marketing__header">
        <div className="taskflow-marketing__container taskflow-marketing__nav">
          <a className="taskflow-marketing__brand" href="https://crtechweb.com.br/" aria-label="C.R TECH">
            <span className="taskflow-marketing__brand-symbol">CR</span>
            <span><strong>C.R <b>TECH</b></strong><small>TaskFlow · Gestão de tarefas</small></span>
          </a>

          <nav aria-label="Navegação da página">
            <a href="#recursos">Recursos</a>
            <a href="#gestao">Gestão</a>
            <a href="#seguranca">Segurança</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>

          <div className="taskflow-marketing__nav-actions">
            <a href={TASKFLOW_PATHS.login}>Entrar</a>
            <a className="taskflow-marketing__nav-cta" href={TASKFLOW_PATHS.login}>
              Começar agora <FiArrowRight />
            </a>
          </div>
        </div>
      </header>

      <main className="taskflow-marketing__main">
        <section className="taskflow-marketing__hero">
          <div className="taskflow-marketing__hero-glow" aria-hidden="true" />
          <div className="taskflow-marketing__container taskflow-marketing__hero-grid">
            <div className="taskflow-marketing__hero-content">
              <span className="taskflow-marketing__kicker">
                <span>TF</span>
                Uma solução C.R TECH
              </span>
              <h1>
                Organize equipes.
                <span>Entregue no prazo.</span>
                Cresça com clareza.
              </h1>
              <p>
                O TaskFlow conecta empresas, setores, responsáveis e tarefas em uma plataforma segura,
                visual e preparada para transformar rotina em resultado.
              </p>

              <div className="taskflow-marketing__hero-actions">
                <a className="taskflow-marketing__button taskflow-marketing__button--primary" href={TASKFLOW_PATHS.login}>
                  Acessar o TaskFlow <FiArrowRight />
                </a>
                <a className="taskflow-marketing__button taskflow-marketing__button--secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
                  <FiMessageCircle /> Falar com especialista
                </a>
              </div>

              <div className="taskflow-marketing__trust">
                <span><FiCheck /> Multiempresa</span>
                <span><FiCheck /> Controle de acesso</span>
                <span><FiCheck /> Dashboard gerencial</span>
              </div>
            </div>

            <div className="taskflow-marketing__hero-visual">
              <div className="taskflow-marketing__browser">
                <div className="taskflow-marketing__browser-bar">
                  <span /><span /><span />
                  <small>TaskFlow · Ambiente de trabalho</small>
                </div>
                <img src={productImage} alt="Quadro Kanban do sistema TaskFlow" />
              </div>

              <div className="taskflow-marketing__float-card taskflow-marketing__float-card--team">
                <FiUsers />
                <span><small>Equipes conectadas</small><strong>Trabalho organizado</strong></span>
              </div>
              <div className="taskflow-marketing__float-card taskflow-marketing__float-card--alert">
                <FiBell />
                <span><small>Prazos monitorados</small><strong>Alertas em tempo real</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__proof">
          <div className="taskflow-marketing__container taskflow-marketing__proof-content">
            <p>Gestão profissional para empresas que valorizam execução</p>
            <div>
              <span><FiTarget /> Prioridades</span>
              <span><FiUsers /> Equipes</span>
              <span><FiTrendingUp /> Indicadores</span>
              <span><FiShield /> Segurança</span>
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__section" id="recursos">
          <div className="taskflow-marketing__container">
            <div className="taskflow-marketing__heading taskflow-marketing__heading--center">
              <span>Plataforma completa</span>
              <h2>Tudo o que a equipe precisa para transformar tarefas em entregas</h2>
              <p>Informações, responsáveis, prazos e decisões reunidos em um fluxo simples de acompanhar.</p>
            </div>

            <div className="taskflow-marketing__features">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title}>
                    <span><Icon /></span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__section taskflow-marketing__showcase-section" id="gestao">
          <div className="taskflow-marketing__container taskflow-marketing__showcase">
            <div className="taskflow-marketing__showcase-image">
              <div><span /><span /><span /><small>Visão operacional</small></div>
              <img src={productImage} alt="Interface visual do TaskFlow" loading="lazy" />
            </div>
            <div className="taskflow-marketing__showcase-copy">
              <span>Do operacional ao gerencial</span>
              <h2>Clareza para quem executa. Indicadores para quem decide.</h2>
              <p>
                O quadro Kanban simplifica o trabalho diário, enquanto o dashboard transforma a operação em
                informações úteis para líderes e administradores.
              </p>
              <ul>
                <li><FiCheckCircle /> Visão por empresa, equipe e responsável</li>
                <li><FiCheckCircle /> Tarefas atrasadas e próximos vencimentos</li>
                <li><FiCheckCircle /> Produtividade e carga de trabalho</li>
                <li><FiCheckCircle /> Histórico completo das movimentações</li>
              </ul>
              <a href={TASKFLOW_PATHS.login}>Explorar a plataforma <FiArrowRight /></a>
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__section">
          <div className="taskflow-marketing__container">
            <div className="taskflow-marketing__heading">
              <span>Flexível para diferentes operações</span>
              <h2>Um fluxo organizado para cada forma de trabalhar</h2>
            </div>
            <div className="taskflow-marketing__use-cases">
              {useCases.map((useCase) => (
                <article key={useCase.number}>
                  <span>{useCase.number}</span>
                  <h3>{useCase.title}</h3>
                  <p>{useCase.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__security" id="seguranca">
          <div className="taskflow-marketing__container taskflow-marketing__security-grid">
            <div>
              <span>Segurança desde a arquitetura</span>
              <h2>Os dados certos, para as pessoas certas.</h2>
              <p>
                Autenticação segura, banco de dados PostgreSQL e políticas de acesso protegem as informações
                de cada empresa, equipe e usuário.
              </p>
              <div className="taskflow-marketing__security-points">
                <span><FiLock /><strong>Acesso autenticado</strong><small>Senhas, recuperação e convites seguros.</small></span>
                <span><FiShield /><strong>Isolamento de dados</strong><small>Regras aplicadas diretamente no banco.</small></span>
                <span><FiZap /><strong>Atualização em tempo real</strong><small>Notificações e colaboração conectadas.</small></span>
              </div>
            </div>
            <div className="taskflow-marketing__security-card">
              <span className="taskflow-marketing__security-icon"><FiShield /></span>
              <small>Proteção multiempresa</small>
              <strong>Row Level Security</strong>
              <p>Cada consulta respeita automaticamente a organização, o papel e as tarefas permitidas.</p>
              <div>
                <span><FiCheck /> Proprietário</span>
                <span><FiCheck /> Administrador</span>
                <span><FiCheck /> Membro</span>
              </div>
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__section">
          <div className="taskflow-marketing__container taskflow-marketing__commercial">
            <div>
              <span>TaskFlow · C.R TECH</span>
              <h2>Comece simples e evolua junto com a sua operação.</h2>
              <p>
                Crie seu ambiente, organize a primeira equipe e valide o fluxo. Para implantação orientada,
                personalizações e suporte comercial, fale diretamente com a C.R TECH.
              </p>
              <div>
                <a className="taskflow-marketing__button taskflow-marketing__button--light" href={TASKFLOW_PATHS.login}>
                  Criar minha conta <FiArrowRight />
                </a>
                <a className="taskflow-marketing__commercial-link" href={whatsappUrl} target="_blank" rel="noreferrer">
                  Solicitar apresentação
                </a>
              </div>
            </div>
            <div className="taskflow-marketing__numbers">
              <article><strong>3</strong><span>perfis de acesso</span></article>
              <article><strong>4</strong><span>etapas do fluxo</span></article>
              <article><strong>10 MB</strong><span>por anexo privado</span></article>
              <article><strong>100%</strong><span>estrutura multiempresa</span></article>
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__section taskflow-marketing__faq-section" id="duvidas">
          <div className="taskflow-marketing__container taskflow-marketing__faq-grid">
            <div className="taskflow-marketing__heading">
              <span>Dúvidas frequentes</span>
              <h2>O que você precisa saber antes de começar</h2>
              <p>Se precisar avaliar um cenário específico, nossa equipe pode ajudar.</p>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">Conversar pelo WhatsApp <FiArrowRight /></a>
            </div>
            <div className="taskflow-marketing__faq">
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}<span>+</span></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="taskflow-marketing__final-cta">
          <div className="taskflow-marketing__container">
            <div>
              <span>Tecnologia que gera resultados</span>
              <h2>Sua equipe pode trabalhar com mais clareza hoje.</h2>
            </div>
            <a className="taskflow-marketing__button taskflow-marketing__button--light" href={TASKFLOW_PATHS.login}>
              Acessar o TaskFlow <FiArrowRight />
            </a>
          </div>
        </section>
      </main>

      <footer className="taskflow-marketing__footer">
        <div className="taskflow-marketing__container">
          <a className="taskflow-marketing__brand" href="https://crtechweb.com.br/">
            <span className="taskflow-marketing__brand-symbol">CR</span>
            <span><strong>C.R <b>TECH</b></strong><small>Tecnologia que gera resultados</small></span>
          </a>
          <p>TaskFlow é uma solução desenvolvida pela C.R TECH.</p>
          <div>
            <a href="https://crtechweb.com.br/">Site institucional</a>
            <a href="mailto:contato@crtechweb.com.br">contato@crtechweb.com.br</a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
