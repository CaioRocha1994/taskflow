import { useState, type FormEvent } from "react";
import { FiLock, FiMail, FiUser } from "react-icons/fi";
import { getSupabase } from "../../lib/supabase";
import "./Access.css";

export function ConfigurationRequired() {
  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <h1>Conecte o Supabase</h1>
        <p>
          Copie <code>.env.example</code> para <code>.env.local</code> e informe a
          URL e a chave publicável do projeto.
        </p>
      </section>
    </main>
  );
}

export function LoadingScreen() {
  return (
    <main className="access-shell">
      <section className="access-card access-card--center">
        <div className="access-spinner" />
        <p>Carregando seu ambiente…</p>
      </section>
    </main>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    const client = getSupabase();

    const result =
      mode === "login"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName.trim() } },
          });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Cadastro criado. Confirme o e-mail para entrar.");
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Informe seu e-mail primeiro.");
      return;
    }
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin },
    );
    if (resetError) setError(resetError.message);
    else setMessage("Enviamos as instruções de recuperação para seu e-mail.");
  }

  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <span className="access-eyebrow">TaskFlow profissional</span>
        <h1>{mode === "login" ? "Acesse seu workspace" : "Crie sua conta"}</h1>
        <p>Empresas, equipes e tarefas protegidas em um único lugar.</p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              <span>Nome completo</span>
              <div className="access-input"><FiUser /><input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            </label>
          )}
          <label>
            <span>E-mail</span>
            <div className="access-input"><FiMail /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </label>
          <label>
            <span>Senha</span>
            <div className="access-input"><FiLock /><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          </label>

          {error && <div className="access-message access-message--error">{error}</div>}
          {message && <div className="access-message">{message}</div>}

          <button className="access-primary" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {mode === "login" && <button className="access-link" onClick={resetPassword}>Esqueci minha senha</button>}
        <button className="access-link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
        </button>
      </section>
    </main>
  );
}

export function UpdatePasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) setError(updateError.message);
    else onComplete();
  }

  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <h1>Defina uma nova senha</h1>
        <p>Use pelo menos oito caracteres e evite reutilizar senhas antigas.</p>
        <form onSubmit={handleSubmit}>
          <label><span>Nova senha</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="access-message access-message--error">{error}</div>}
          <button className="access-primary" disabled={isSubmitting}>{isSubmitting ? "Salvando…" : "Atualizar senha"}</button>
        </form>
      </section>
    </main>
  );
}

interface OnboardingProps { onComplete: () => void }

export function Onboarding({ onComplete }: OnboardingProps) {
  const [companyName, setCompanyName] = useState("");
  const [teamName, setTeamName] = useState("Geral");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const { error: rpcError } = await getSupabase().rpc("create_organization", {
      p_name: companyName,
      p_team_name: teamName,
    });
    setIsSubmitting(false);
    if (rpcError) setError(rpcError.message);
    else onComplete();
  }

  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <span className="access-eyebrow">Primeiros passos</span>
        <h1>Configure sua empresa</h1>
        <p>Você será o proprietário e poderá convidar administradores e membros.</p>
        <form onSubmit={handleSubmit}>
          <label><span>Nome da empresa</span><input required minLength={2} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex.: Rocha Tecnologia" /></label>
          <label><span>Primeira equipe ou setor</span><input required minLength={2} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ex.: Operações" /></label>
          {error && <div className="access-message access-message--error">{error}</div>}
          <button className="access-primary" disabled={isSubmitting}>{isSubmitting ? "Criando…" : "Criar workspace"}</button>
        </form>
      </section>
    </main>
  );
}
