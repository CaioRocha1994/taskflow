import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FiCopy,
  FiMail,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUserMinus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { getSupabase } from "../../lib/supabase";
import type { MembershipRole, Team, WorkspaceMember } from "../../types/workspace";
import "./WorkspaceSettings.css";

interface WorkspaceSettingsProps {
  isOpen: boolean;
  organizationId: string;
  currentUserId: string;
  teams: Team[];
  members: WorkspaceMember[];
  onClose: () => void;
  onChanged: () => void;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: Exclude<MembershipRole, "owner">;
  team_id: string | null;
  token: string;
  expires_at: string;
  created_at: string;
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

function invitationUrl(token: string) {
  return `${window.location.origin}/?invite=${token}`;
}

export function WorkspaceSettings({
  isOpen,
  organizationId,
  currentUserId,
  teams,
  members,
  onClose,
  onChanged,
}: WorkspaceSettingsProps) {
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<MembershipRole, "owner">>("member");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [membershipTeamId, setMembershipTeamId] = useState("");
  const [membershipUserId, setMembershipUserId] = useState("");
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<WorkspaceMember | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!isOpen || !organizationId) return;

    setIsLoadingInvitations(true);
    const { data, error } = await getSupabase()
      .from("invitations")
      .select("id, email, role, team_id, token, expires_at, created_at")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setInvitations((data ?? []) as PendingInvitation[]);
    }
    setIsLoadingInvitations(false);
  }, [isOpen, organizationId]);

  useEffect(() => {
    if (!isOpen) return;

    if (!teams.some((team) => team.id === inviteTeamId)) {
      setInviteTeamId(teams[0]?.id ?? "");
    }
    if (!teams.some((team) => team.id === membershipTeamId)) {
      setMembershipTeamId(teams[0]?.id ?? "");
    }
    if (!members.some((member) => member.userId === membershipUserId)) {
      setMembershipUserId(members[0]?.userId ?? "");
    }
  }, [isOpen, teams, members, inviteTeamId, membershipTeamId, membershipUserId]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  if (!isOpen) return null;

  async function createTeam(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusyKey("create-team");
    const { error } = await getSupabase().from("teams").insert({
      organization_id: organizationId,
      name: teamName.trim(),
    });
    setBusyKey("");

    if (error) setMessage(error.message);
    else {
      setTeamName("");
      setMessage("Equipe criada com sucesso.");
      onChanged();
    }
  }

  async function createInvitation(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusyKey("create-invite");
    const client = getSupabase();
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    const { error: cleanupError } = await client
      .from("invitations")
      .delete()
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .is("accepted_at", null);

    if (cleanupError) {
      setBusyKey("");
      setMessage(cleanupError.message);
      return;
    }

    const { data, error } = await client
      .from("invitations")
      .insert({
        organization_id: organizationId,
        team_id: inviteTeamId || null,
        email: normalizedEmail,
        role: inviteRole,
        invited_by: currentUserId,
      })
      .select("token")
      .single();
    if (error) {
      setBusyKey("");
      setMessage(error.message);
      return;
    }

    const link = invitationUrl(data.token);
    setInviteLink(link);
    const { error: emailError } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: link, shouldCreateUser: true },
    });

    setBusyKey("");
    setInviteEmail("");
    setMessage(emailError
      ? "O convite foi criado, mas o e-mail não pôde ser enviado. Copie e compartilhe o link abaixo."
      : "Convite enviado por e-mail. O link também está disponível abaixo.");
    await loadInvitations();
  }

  async function addMemberToTeam(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusyKey("add-team-member");
    const { error } = await getSupabase().from("team_members").insert({
      organization_id: organizationId,
      team_id: membershipTeamId,
      user_id: membershipUserId,
    });
    setBusyKey("");

    if (error?.code === "23505") setMessage("Esse usuário já pertence à equipe.");
    else if (error) setMessage(error.message);
    else {
      setMessage("Usuário adicionado à equipe.");
      onChanged();
    }
  }

  async function updateMemberRole(userId: string, role: Exclude<MembershipRole, "owner">) {
    setMessage("");
    setBusyKey(`role-${userId}`);
    const { error } = await getSupabase()
      .from("organization_members")
      .update({ role })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    setBusyKey("");

    if (error) setMessage(error.message);
    else {
      setMessage("Permissão atualizada com sucesso.");
      onChanged();
    }
  }

  async function removeMemberFromTeam(userId: string, teamId: string) {
    setMessage("");
    setBusyKey(`team-${userId}-${teamId}`);
    const { error } = await getSupabase()
      .from("team_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("team_id", teamId);
    setBusyKey("");

    if (error) setMessage(error.message);
    else {
      setMessage("Usuário removido da equipe.");
      onChanged();
    }
  }

  async function removeMember() {
    if (!memberPendingRemoval) return;

    setMessage("");
    setBusyKey(`remove-${memberPendingRemoval.userId}`);
    const { error } = await getSupabase()
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", memberPendingRemoval.userId);
    setBusyKey("");

    if (error) setMessage(error.message);
    else {
      setMessage(`${memberPendingRemoval.fullName} foi removido(a) da empresa.`);
      setMemberPendingRemoval(null);
      onChanged();
    }
  }

  async function cancelInvitation(invitationId: string) {
    setMessage("");
    setBusyKey(`invite-${invitationId}`);
    const { error } = await getSupabase()
      .from("invitations")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", invitationId);
    setBusyKey("");

    if (error) setMessage(error.message);
    else {
      setMessage("Convite cancelado.");
      await loadInvitations();
    }
  }

  async function copyInvitation(token: string) {
    await navigator.clipboard.writeText(invitationUrl(token));
    setMessage("Link do convite copiado.");
  }

  return (
    <div className="workspace-settings__overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="workspace-settings" role="dialog" aria-modal="true" aria-labelledby="workspace-settings-title">
        <header>
          <div>
            <span>Administração</span>
            <h2 id="workspace-settings-title">Empresa, equipes e acessos</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose}><FiX size={21} /></button>
        </header>

        <div className="workspace-settings__summary">
          <div><FiUsers /><span><strong>{members.length}</strong> usuários</span></div>
          <div><FiShield /><span><strong>{teams.length}</strong> equipes ou setores</span></div>
          <div><FiMail /><span><strong>{invitations.length}</strong> convites pendentes</span></div>
        </div>

        <div className="workspace-settings__grid">
          <section>
            <h3><FiUsers /> Equipes e setores</h3>
            <ul className="workspace-settings__team-list">
              {teams.map((team) => (
                <li key={team.id}>
                  <strong>{team.name}</strong>
                  <span>{members.filter((member) => member.teamIds.includes(team.id)).length} membro(s)</span>
                </li>
              ))}
              {teams.length === 0 && <li className="workspace-settings__empty">Nenhuma equipe cadastrada.</li>}
            </ul>

            <form onSubmit={createTeam}>
              <label>
                <span>Nova equipe ou setor</span>
                <input required minLength={2} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Ex.: Financeiro" />
              </label>
              <button disabled={busyKey === "create-team"}><FiPlus /> {busyKey === "create-team" ? "Criando..." : "Criar equipe"}</button>
            </form>

            <form onSubmit={addMemberToTeam}>
              <span className="workspace-settings__form-title">Adicionar usuário à equipe</span>
              <label>
                <span>Usuário</span>
                <select required value={membershipUserId} onChange={(event) => setMembershipUserId(event.target.value)}>
                  {members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                </select>
              </label>
              <label>
                <span>Equipe</span>
                <select required value={membershipTeamId} onChange={(event) => setMembershipTeamId(event.target.value)}>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <button disabled={!membershipUserId || !membershipTeamId || busyKey === "add-team-member"}>
                <FiPlus /> {busyKey === "add-team-member" ? "Adicionando..." : "Adicionar usuário"}
              </button>
            </form>
          </section>

          <section>
            <h3><FiUsers /> Usuários e permissões</h3>
            <ul className="workspace-settings__member-list">
              {members.map((member) => (
                <li key={member.userId}>
                  <div className="workspace-settings__member-heading">
                    <span className="workspace-settings__avatar">{member.fullName.slice(0, 1).toUpperCase()}</span>
                    <span className="workspace-settings__identity">
                      <strong>{member.fullName}</strong>
                      <small>{member.email}</small>
                    </span>
                    {member.role === "owner" ? (
                      <span className="workspace-settings__owner"><FiShield /> Proprietário</span>
                    ) : (
                      <select
                        className="workspace-settings__role"
                        aria-label={`Permissão de ${member.fullName}`}
                        value={member.role}
                        disabled={busyKey === `role-${member.userId}`}
                        onChange={(event) => void updateMemberRole(member.userId, event.target.value as "admin" | "member")}
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </div>

                  <div className="workspace-settings__member-footer">
                    <div className="workspace-settings__team-tags">
                      {member.teamIds.map((teamId) => {
                        const team = teams.find((item) => item.id === teamId);
                        if (!team) return null;
                        return (
                          <span key={teamId}>
                            {team.name}
                            <button
                              type="button"
                              aria-label={`Remover ${member.fullName} de ${team.name}`}
                              disabled={busyKey === `team-${member.userId}-${teamId}`}
                              onClick={() => void removeMemberFromTeam(member.userId, teamId)}
                            ><FiX /></button>
                          </span>
                        );
                      })}
                      {member.teamIds.length === 0 && <small>Sem equipe</small>}
                    </div>
                    {member.role !== "owner" && member.userId !== currentUserId && (
                      <button
                        type="button"
                        className="workspace-settings__remove-member"
                        onClick={() => setMemberPendingRemoval(member)}
                      ><FiUserMinus /> Remover</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <form onSubmit={createInvitation}>
              <span className="workspace-settings__form-title">Convidar novo usuário</span>
              <label>
                <span>E-mail</span>
                <input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="nome@empresa.com" />
              </label>
              <div className="workspace-settings__row">
                <label>
                  <span>Papel</span>
                  <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}>
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>
                <label>
                  <span>Equipe inicial</span>
                  <select value={inviteTeamId} onChange={(event) => setInviteTeamId(event.target.value)}>
                    <option value="">Sem equipe</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </label>
              </div>
              <button disabled={busyKey === "create-invite"}><FiMail /> {busyKey === "create-invite" ? "Enviando..." : "Enviar convite por e-mail"}</button>
            </form>
            {inviteLink && (
              <div className="workspace-settings__invite">
                <input readOnly value={inviteLink} />
                <button type="button" onClick={() => void copyInvitation(inviteLink.split("=").at(-1) ?? "")} aria-label="Copiar convite"><FiCopy /></button>
              </div>
            )}
          </section>
        </div>

        <section className="workspace-settings__pending">
          <div className="workspace-settings__section-heading">
            <div><FiMail /><span><strong>Convites pendentes</strong><small>Links ainda não utilizados</small></span></div>
            {isLoadingInvitations && <span>Atualizando...</span>}
          </div>
          <div className="workspace-settings__invitation-list">
            {invitations.map((invitation) => {
              const team = teams.find((item) => item.id === invitation.team_id);
              const expired = new Date(invitation.expires_at).getTime() < Date.now();
              return (
                <article key={invitation.id}>
                  <div>
                    <strong>{invitation.email}</strong>
                    <span>{ROLE_LABELS[invitation.role]} · {team?.name ?? "Sem equipe"} · {expired ? "Expirado" : "Aguardando aceite"}</span>
                  </div>
                  <div>
                    <button type="button" disabled={expired} onClick={() => void copyInvitation(invitation.token)}><FiCopy /> Copiar</button>
                    <button type="button" className="workspace-settings__cancel-invite" disabled={busyKey === `invite-${invitation.id}`} onClick={() => void cancelInvitation(invitation.id)}><FiTrash2 /> Cancelar</button>
                  </div>
                </article>
              );
            })}
            {!isLoadingInvitations && invitations.length === 0 && <p className="workspace-settings__empty">Nenhum convite pendente.</p>}
          </div>
        </section>

        {memberPendingRemoval && (
          <div className="workspace-settings__confirmation" role="alert">
            <div>
              <strong>Remover {memberPendingRemoval.fullName} da empresa?</strong>
              <span>O acesso será encerrado e as tarefas atribuídas ficarão sem responsável.</span>
            </div>
            <button type="button" onClick={() => setMemberPendingRemoval(null)}>Cancelar</button>
            <button type="button" className="workspace-settings__confirm-remove" disabled={busyKey === `remove-${memberPendingRemoval.userId}`} onClick={() => void removeMember()}>
              {busyKey === `remove-${memberPendingRemoval.userId}` ? "Removendo..." : "Confirmar remoção"}
            </button>
          </div>
        )}

        {message && <p className="workspace-settings__message">{message}</p>}
      </section>
    </div>
  );
}
