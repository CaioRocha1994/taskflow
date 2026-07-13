import { useState, type FormEvent } from "react";
import { FiArrowLeft, FiCheck, FiLock, FiMail, FiUser } from "react-icons/fi";
import { getSupabase } from "../../lib/supabase";
import { getPasswordRequirements, isStrongPassword } from "../../utils/password";
import "./Access.css";

export function ConfigurationRequired() {
  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <h1>Conecte o Supabase</h1>
        <p>Copie <code>.env.example</code> para <code>.env.local</code> e informe a URL e a chave publicável do projeto.</p>
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

function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="access-requirements" aria-label="Requisitos da senha">
      {getPasswordRequirements(password).map((requirement) => (
        <li key={requirement.label} className={requirement.valid ? "access-requirement--valid" : ""}>
          <FiCheck /> {requirement.label}
        </li>
      ))}
    </ul>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(nextMode: "login" | "signup" | "recovery") {
    setMode(nextMode);
    setPassword("");
    setPasswordConfirmation("");
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    const client = getSupabase();

    if (mode === "recovery") {
      const redirectTo = new URL("/?recovery=1", window.location.origin).toString();
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      setIsSubmitting(false);
      if (resetError) setError(resetError.message);
      else setMessage("Enviamos um link seguro para redefinir sua senha. Verifique também a caixa de spam.");
      return;
    }

    if (mode === "signup") {
      if (!isStrongPassword(password)) {
        setIsSubmitting(false);
        setError("A senha ainda não atende a todos os requisitos de segurança.");
        return;
      }
      if (password !== passwordConfirmation) {
        setIsSubmitting(false);
        setError("A confirmação da senha não confere.");
        return;
      }
    }

    const result = mode === "login"
      ? await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      : await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin },
        });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Cadastro criado. Confirme o e-mail para acessar seu workspace.");
    }
  }

  const title = mode === "login" ? "Acesse seu workspace" : mode === "signup" ? "Crie sua conta" : "Recupere sua senha";
  const description = mode === "recovery"
    ? "Informe o e-mail da sua conta para receber um link de recuperação."
    : "Empresas, equipes e tarefas protegidas em um único lugar.";

  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <span className="access-eyebrow">TaskFlow profissional</span>
        <h1>{title}</h1>
        <p>{description}</p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              <span>Nome completo</span>
              <div className="access-input"><FiUser /><input required minLength={2} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
            </label>
          )}
          <label>
            <span>E-mail</span>
            <div className="access-input"><FiMail /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          </label>
          {mode !== "recovery" && (
            <label>
              <span>Senha</span>
              <div className="access-input"><FiLock /><input required minLength={mode === "signup" ? 10 : 8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            </label>
          )}
          {mode === "signup" && (
            <>
              <PasswordRequirements password={password} />
              <label>
                <span>Confirme a senha</span>
                <div className="access-input"><FiLock /><input required minLength={10} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></div>
              </label>
            </>
          )}

          {error && <div className="access-message access-message--error" role="alert">{error}</div>}
          {message && <div className="access-message" role="status">{message}</div>}

          <button className="access-primary" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}
          </button>
        </form>

        {mode === "login" && <button type="button" className="access-link" onClick={() => changeMode("recovery")}>Esqueci minha senha</button>}
        {mode === "recovery" ? (
          <button type="button" className="access-link access-link--back" onClick={() => changeMode("login")}><FiArrowLeft /> Voltar para o login</button>
        ) : (
          <button type="button" className="access-link" onClick={() => changeMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
          </button>
        )}
      </section>
    </main>
  );
}

export function UpdatePasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("A senha ainda não atende a todos os requisitos de segurança.");
      return;
    }
    if (password !== confirmation) {
      setError("A confirmação da senha não confere.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) setError(updateError.message);
    else {
      window.history.replaceState({}, "", window.location.pathname);
      onComplete();
    }
  }

  return (
    <main className="access-shell">
      <section className="access-card">
        <div className="access-brand">TF</div>
        <span className="access-eyebrow">Segurança da conta</span>
        <h1>Defina uma nova senha</h1>
        <p>Crie uma senha forte e diferente das utilizadas em outros serviços.</p>
        <form onSubmit={handleSubmit}>
          <label><span>Nova senha</span><div className="access-input"><FiLock /><input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>
          <PasswordRequirements password={password} />
          <label><span>Confirme a nova senha</span><div className="access-input"><FiLock /><input required minLength={10} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></label>
          {error && <div className="access-message access-message--error" role="alert">{error}</div>}
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
    const { error: rpcError } = await getSupabase().rpc("create_organization", { p_name: companyName, p_team_name: teamName });
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
          <label><span>Nome da empresa</span><input required minLength={2} value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: Rocha Tecnologia" /></label>
          <label><span>Primeira equipe ou setor</span><input required minLength={2} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Ex.: Operações" /></label>
          {error && <div className="access-message access-message--error">{error}</div>}
          <button className="access-primary" disabled={isSubmitting}>{isSubmitting ? "Criando…" : "Criar workspace"}</button>
        </form>
      </section>
    </main>
  );
}
