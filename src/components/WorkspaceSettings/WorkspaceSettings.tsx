import { useEffect, useState, type FormEvent } from "react";
import { FiCopy, FiPlus, FiUsers, FiX } from "react-icons/fi";
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

  useEffect(() => {
    if (isOpen && !inviteTeamId) setInviteTeamId(teams[0]?.id ?? "");
    if (isOpen && !membershipTeamId) setMembershipTeamId(teams[0]?.id ?? "");
    if (isOpen && !membershipUserId) setMembershipUserId(members[0]?.userId ?? "");
  }, [isOpen, teams, members, inviteTeamId, membershipTeamId, membershipUserId]);

  if (!isOpen) return null;

  async function createTeam(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const { error } = await getSupabase().from("teams").insert({
      organization_id: organizationId,
      name: teamName.trim(),
    });
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
    const { data, error } = await getSupabase()
      .from("invitations")
      .insert({
        organization_id: organizationId,
        team_id: inviteTeamId || null,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: currentUserId,
      })
      .select("token")
      .single();
    if (error) setMessage(error.message);
    else {
      const link = `${window.location.origin}/?invite=${data.token}`;
      setInviteLink(link);
      setInviteEmail("");
      setMessage("Convite criado. Compartilhe o link abaixo com o usuário.");
    }
  }

  async function addMemberToTeam(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const { error } = await getSupabase().from("team_members").insert({
      organization_id: organizationId,
      team_id: membershipTeamId,
      user_id: membershipUserId,
    });
    if (error?.code === "23505") setMessage("Esse usuário já pertence à equipe.");
    else if (error) setMessage(error.message);
    else {
      setMessage("Usuário adicionado à equipe.");
      onChanged();
    }
  }

  return (
    <div className="workspace-settings__overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="workspace-settings" role="dialog" aria-modal="true">
        <header>
          <div><span>Administração</span><h2>Empresa e equipes</h2></div>
          <button aria-label="Fechar" onClick={onClose}><FiX size={21} /></button>
        </header>

        <div className="workspace-settings__grid">
          <section>
            <h3><FiUsers /> Equipes</h3>
            <ul>{teams.map((team) => <li key={team.id}><strong>{team.name}</strong><span>{members.filter((member) => member.teamIds.includes(team.id)).length} membro(s)</span></li>)}</ul>
            <form onSubmit={createTeam}>
              <label><span>Nova equipe ou setor</span><input required minLength={2} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Ex.: Financeiro" /></label>
              <button><FiPlus /> Criar equipe</button>
            </form>
            <form onSubmit={addMemberToTeam}>
              <span className="workspace-settings__form-title">Adicionar usuário à equipe</span>
              <label><span>Usuário</span><select required value={membershipUserId} onChange={(event) => setMembershipUserId(event.target.value)}>{members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>
              <label><span>Equipe</span><select required value={membershipTeamId} onChange={(event) => setMembershipTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <button disabled={!membershipUserId || !membershipTeamId}><FiPlus /> Adicionar usuário</button>
            </form>
          </section>

          <section>
            <h3><FiUsers /> Usuários</h3>
            <ul>{members.map((member) => <li key={member.userId}><strong>{member.fullName}</strong><span>{member.email} · {member.role}</span></li>)}</ul>
            <form onSubmit={createInvitation}>
              <label><span>E-mail do novo usuário</span><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label>
              <div className="workspace-settings__row">
                <label><span>Papel</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}><option value="member">Membro</option><option value="admin">Administrador</option></select></label>
                <label><span>Equipe</span><select value={inviteTeamId} onChange={(event) => setInviteTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              </div>
              <button><FiPlus /> Gerar convite</button>
            </form>
            {inviteLink && <div className="workspace-settings__invite"><input readOnly value={inviteLink} /><button type="button" onClick={() => void navigator.clipboard.writeText(inviteLink)} aria-label="Copiar convite"><FiCopy /></button></div>}
          </section>
        </div>
        {message && <p className="workspace-settings__message">{message}</p>}
      </section>
    </div>
  );
}
