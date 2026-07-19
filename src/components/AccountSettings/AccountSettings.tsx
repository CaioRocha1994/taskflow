import { useEffect, useState, type FormEvent } from "react";
import { FiBell, FiCheck, FiLock, FiMoon, FiSave, FiSun, FiUser, FiX } from "react-icons/fi";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { getSupabase } from "../../lib/supabase";
import { getAuthErrorMessage } from "../../utils/authErrors";
import { getPasswordRequirements, isStrongPassword } from "../../utils/password";
import "./AccountSettings.css";

interface AccountSettingsProps {
  isOpen: boolean;
  currentName: string;
  email: string;
  onClose: () => void;
  onChanged: () => void;
}

export function AccountSettings({ isOpen, currentName, email, onClose, onChanged }: AccountSettingsProps) {
  const { preferences, error: preferencesError, updatePreferences, toggleTheme, setBrowserNotificationsEnabled } = useUserPreferences();
  const [fullName, setFullName] = useState(currentName);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFullName(currentName);
    setPassword("");
    setConfirmation("");
    setMessage("");
    setError("");

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentName, onClose]);

  if (!isOpen) return null;

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    setBusyKey("profile");
    setError("");
    setMessage("");
    const { error: updateError } = await getSupabase().auth.updateUser({ data: { full_name: fullName.trim() } });
    setBusyKey("");

    if (updateError) setError(getAuthErrorMessage(updateError, "Não foi possível atualizar o perfil."));
    else {
      setMessage("Nome atualizado com sucesso.");
      onChanged();
    }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isStrongPassword(password)) {
      setError("A senha ainda não atende a todos os requisitos de segurança.");
      return;
    }
    if (password !== confirmation) {
      setError("A confirmação da senha não confere.");
      return;
    }

    setBusyKey("password");
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    setBusyKey("");
    if (updateError) setError(getAuthErrorMessage(updateError, "Não foi possível alterar a senha."));
    else {
      setPassword("");
      setConfirmation("");
      setMessage("Senha alterada com sucesso.");
    }
  }

  async function updateBrowserNotifications(enabled: boolean) {
    setError("");
    setMessage("");
    setBusyKey("browser-notifications");
    try {
      await setBrowserNotificationsEnabled(enabled);
      setMessage(enabled ? "Notificações do navegador ativadas." : "Notificações do navegador desativadas.");
    } catch (notificationError) {
      setError(notificationError instanceof Error ? notificationError.message : "Não foi possível alterar as notificações.");
    } finally {
      setBusyKey("");
    }
  }

  async function updatePreference(update: Parameters<typeof updatePreferences>[0], successMessage: string) {
    setError("");
    setMessage("");
    setBusyKey("preferences");
    try {
      await updatePreferences(update);
      setMessage(successMessage);
    } catch {
      setError("Não foi possível salvar a preferência.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="account-settings__overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="account-settings" role="dialog" aria-modal="true" aria-labelledby="account-settings-title">
        <header>
          <div><span>Conta e segurança</span><h2 id="account-settings-title">Minha conta</h2></div>
          <button type="button" aria-label="Fechar" onClick={onClose}><FiX size={21} /></button>
        </header>

        <div className="account-settings__identity">
          <div>{fullName.slice(0, 1).toUpperCase()}</div>
          <span><strong>{fullName || "Usuário"}</strong><small>{email}</small></span>
        </div>

        <form onSubmit={updateProfile}>
          <div className="account-settings__section-title"><FiUser /><span><strong>Dados pessoais</strong><small>Nome exibido para sua equipe</small></span></div>
          <label><span>Nome completo</span><input required minLength={2} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
          <label><span>E-mail</span><input readOnly value={email} /></label>
          <button disabled={busyKey === "profile"}><FiSave /> {busyKey === "profile" ? "Salvando..." : "Salvar perfil"}</button>
        </form>

        <section className="account-settings__preferences" aria-labelledby="account-preferences-title">
          <div className="account-settings__section-title">
            {preferences.theme === "dark" ? <FiMoon /> : <FiSun />}
            <span><strong id="account-preferences-title">Aparência e notificações</strong><small>Preferências salvas na sua conta</small></span>
          </div>

          <div className="account-settings__preference-row">
            <span><strong>Tema do sistema</strong><small>Alterne entre a aparência clara e escura</small></span>
            <button type="button" className="account-settings__choice" onClick={() => void toggleTheme()}>
              {preferences.theme === "dark" ? <><FiMoon /> Escuro</> : <><FiSun /> Claro</>}
            </button>
          </div>

          <div className="account-settings__preference-row">
            <span><strong><FiBell /> Notificações do navegador</strong><small>Alertas mesmo quando a aba não estiver em foco</small></span>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.browserNotificationsEnabled}
              className={`account-settings__switch${preferences.browserNotificationsEnabled ? " account-settings__switch--active" : ""}`}
              disabled={busyKey === "browser-notifications"}
              onClick={() => void updateBrowserNotifications(!preferences.browserNotificationsEnabled)}
            ><span /></button>
          </div>

          <label className="account-settings__preference-select">
            <span><strong>Antecedência do alerta</strong><small>Quanto tempo antes do prazo você deseja ser avisado</small></span>
            <select
              value={preferences.dueSoonMinutes}
              disabled={busyKey === "preferences"}
              onChange={(event) => void updatePreference(
                { dueSoonMinutes: Number(event.target.value) },
                "Antecedência do alerta atualizada.",
              )}
            >
              <option value={5}>5 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={1440}>1 dia</option>
            </select>
          </label>
        </section>

        <form onSubmit={updatePassword}>
          <div className="account-settings__section-title"><FiLock /><span><strong>Alterar senha</strong><small>Use uma senha exclusiva para o TaskFlow</small></span></div>
          <label><span>Nova senha</span><input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <ul className="account-settings__requirements">
            {getPasswordRequirements(password).map((requirement) => (
              <li key={requirement.label} className={requirement.valid ? "account-settings__requirement--valid" : ""}><FiCheck /> {requirement.label}</li>
            ))}
          </ul>
          <label><span>Confirme a nova senha</span><input required minLength={10} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <button disabled={busyKey === "password"}><FiLock /> {busyKey === "password" ? "Alterando..." : "Alterar senha"}</button>
        </form>

        {(error || preferencesError) && <p className="account-settings__message account-settings__message--error" role="alert">{error || preferencesError}</p>}
        {message && <p className="account-settings__message" role="status">{message}</p>}
      </section>
    </div>
  );
}
