import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Shield,
  UserCog,
  Mail,
  Plus,
  X,
  ChevronDown,
  Clock,
  Check,
  AlertTriangle,
  Loader2,
  Search,
  Ban,
  RefreshCw,
} from 'lucide-react';

interface StaffProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'staff';
  created_at: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: 'staff' | 'admin';
  invited_by_email: string | null;
  created_at: string;
  status: string;
}

type RoleOption = 'staff' | 'admin';

export default function AdminStaff() {
  const { user } = useAuth();

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add panel state
  const [showAdd, setShowAdd] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleOption>('staff');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<Record<string, string>>({});

  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, invitesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, role, created_at')
          .in('role', ['admin', 'staff'])
          .order('created_at', { ascending: true }),
        supabase
          .from('staff_invitations')
          .select('id, email, role, invited_by_email, created_at, status')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setStaff((profilesRes.data ?? []) as StaffProfile[]);
      setInvitations((invitesRes.data ?? []) as PendingInvitation[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Close role menu on outside click
  useEffect(() => {
    if (!openRoleMenu) return;
    const handler = () => setOpenRoleMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openRoleMenu]);

  const handleChangeRole = async (memberId: string, newRole: RoleOption) => {
    setChangingRole(memberId);
    setOpenRoleMenu(null);
    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_user_id: memberId,
        p_role: newRole,
      });
      if (error) throw error;
      await fetchData();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setChangingRole(null);
    }
  };

  const handleRevoke = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from staff? They will lose admin panel access.`)) return;
    setRevoking(memberId);
    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_user_id: memberId,
        p_role: 'customer',
      });
      if (error) throw error;
      await fetchData();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setCancellingInvite(inviteId);
    try {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);
      if (error) throw error;
      await fetchData();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancellingInvite(null);
    }
  };

  const handleResendInvite = async (inviteId: string, inviteEmail: string) => {
    setResendingInvite(inviteId);
    setResendMsg((prev) => ({ ...prev, [inviteId]: '' }));
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'resend-invite', invite_id: inviteId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResendMsg((prev) => ({ ...prev, [inviteId]: `Invite resent to ${inviteEmail}` }));
      setTimeout(() => setResendMsg((prev) => { const n = { ...prev }; delete n[inviteId]; return n; }), 4000);
    } catch (e) {
      setResendMsg((prev) => ({ ...prev, [inviteId]: `Error: ${(e as Error).message}` }));
    } finally {
      setResendingInvite(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'invite-staff', email: inviteEmail.trim(), role: inviteRole },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.action === 'promoted') {
        setInviteMsg({ type: 'success', text: `${data.email} already has an account and has been promoted to ${inviteRole}.` });
      } else if (data?.emailSent) {
        setInviteMsg({ type: 'success', text: `Invitation email sent to ${data.email}. They'll receive a link to set up their account.` });
      } else {
        setInviteMsg({ type: 'success', text: `Invitation recorded for ${data?.email ?? inviteEmail}. Note: invite email could not be sent (${data?.emailError ?? 'unknown reason'}) — they'll still be promoted automatically when they sign up.` });
      }
      setInviteEmail('');
      await fetchData();
    } catch (e) {
      setInviteMsg({ type: 'error', text: (e as Error).message });
    } finally {
      setInviting(false);
    }
  };

  const adminCount = staff.filter((s) => s.role === 'admin').length;
  const staffCount = staff.filter((s) => s.role === 'staff').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage who has access to the admin panel</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setInviteMsg(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admins', value: adminCount, icon: Shield, color: 'text-red-600 bg-red-50 border-red-100' },
          { label: 'Staff', value: staffCount, icon: UserCog, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Pending Invites', value: invitations.length, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Team Members</h3>
          <span className="ml-auto text-xs text-gray-400">{staff.length} total</span>
        </div>

        {staff.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No staff or admin accounts yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map((member) => {
              const isSelf = member.id === user?.id;
              const isAdmin = member.role === 'admin';
              const initial = (member.full_name ?? member.email).charAt(0).toUpperCase();

              return (
                <div key={member.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {initial}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {member.full_name ?? 'Unnamed'}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>

                  {/* Role badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    isAdmin
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {isAdmin ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>

                  {/* Joined date */}
                  <span className="hidden md:block text-xs text-gray-400 w-24 text-right flex-shrink-0">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>

                  {/* Actions */}
                  {!isSelf ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Role switcher */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenRoleMenu(openRoleMenu === member.id ? null : member.id); }}
                          disabled={changingRole === member.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {changingRole === member.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>Change Role <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                        {openRoleMenu === member.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                            {(['admin', 'staff'] as RoleOption[]).map((r) => (
                              <button
                                key={r}
                                onClick={() => handleChangeRole(member.id, r)}
                                disabled={member.role === r}
                                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                                  member.role === r
                                    ? 'text-gray-300 cursor-default'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {member.role === r && <Check className="w-3 h-3 text-green-500" />}
                                {member.role !== r && <span className="w-3" />}
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Revoke */}
                      <button
                        onClick={() => handleRevoke(member.id, member.email)}
                        disabled={revoking === member.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke access"
                      >
                        {revoking === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="w-[120px]" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-800">Pending Invitations</h3>
            <span className="ml-auto text-xs text-amber-500">{invitations.length} awaiting</span>
          </div>
          <div className="divide-y divide-gray-50">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      Invited {new Date(inv.created_at).toLocaleDateString()}
                      {inv.invited_by_email && ` · by ${inv.invited_by_email}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    inv.role === 'admin'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                  </span>
                  <button
                    onClick={() => handleResendInvite(inv.id, inv.email)}
                    disabled={resendingInvite === inv.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                    title="Resend invite email"
                  >
                    {resendingInvite === inv.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RefreshCw className="w-3 h-3" />}
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancellingInvite === inv.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    {cancellingInvite === inv.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {resendMsg[inv.id] && (
                  <p className={`mt-2 text-xs px-2 py-1 rounded ${
                    resendMsg[inv.id].startsWith('Error')
                      ? 'text-red-600 bg-red-50'
                      : 'text-green-700 bg-green-50'
                  }`}>
                    {resendMsg[inv.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Drawer */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Staff Member</h3>
                <p className="text-xs text-gray-500 mt-0.5">Promote an existing user or send an invitation</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <form onSubmit={handleInvite} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    If this user already has an account, they'll be promoted immediately. Otherwise an invitation is recorded for when they sign up.
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'staff', label: 'Staff', desc: 'Can view orders, customers, sell requests', icon: UserCog, color: 'blue' },
                      { value: 'admin', label: 'Admin', desc: 'Full access to all features', icon: Shield, color: 'red' },
                    ] as const).map(({ value, label, desc, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setInviteRole(value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          inviteRole === value
                            ? color === 'blue'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${
                          inviteRole === value
                            ? color === 'blue' ? 'text-blue-600' : 'text-red-600'
                            : 'text-gray-400'
                        }`} />
                        <p className={`text-xs font-semibold ${inviteRole === value ? (color === 'blue' ? 'text-blue-700' : 'text-red-700') : 'text-gray-700'}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {inviteMsg && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    inviteMsg.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {inviteMsg.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {inviteMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Add / Invite Member</>
                  )}
                </button>
              </form>

              {/* Info box */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700">How it works</p>
                <ul className="text-[11px] text-gray-500 space-y-1.5">
                  <li className="flex items-start gap-1.5"><Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />If the email matches an existing account, their role is updated immediately.</li>
                  <li className="flex items-start gap-1.5"><Clock className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />If no account exists, an invitation is recorded. Their role is set automatically when they sign up with that email.</li>
                  <li className="flex items-start gap-1.5"><Ban className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />You can cancel pending invitations at any time from the list below.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
