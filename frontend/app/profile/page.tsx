"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { User, ApiToken, ApiTokenCreated } from "@/lib/types";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiry, setNewTokenExpiry] = useState("30");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [tokenErr, setTokenErr] = useState("");
  const [tokenCreating, setTokenCreating] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const data = await api.get<ApiToken[]>("/profile/tokens");
      setTokens(data);
    } catch { toast.error("Failed to load API tokens"); }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setProfileSaving(true);
    try {
      await api.patch<User>("/profile", { display_name: displayName });
      await refreshUser();
      setProfileMsg("Profile updated");
    } catch (err: unknown) {
      setProfileErr(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordErr("");
    if (newPassword.length < 8) {
      setPasswordErr("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.put("/profile/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated");
    } catch (err: unknown) {
      setPasswordErr(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    setTokenErr("");
    setCreatedToken(null);
    setTokenCopied(false);
    setTokenCreating(true);
    try {
      const data = await api.post<ApiTokenCreated>("/profile/tokens", {
        name: newTokenName,
        expires_in_days: newTokenExpiry === "never" ? null : parseInt(newTokenExpiry),
      });
      setCreatedToken(data.token);
      setNewTokenName("");
      setNewTokenExpiry("30");
      loadTokens();
    } catch (err: unknown) {
      setTokenErr(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setTokenCreating(false);
    }
  }

  async function handleRevokeToken(tokenId: number) {
    try {
      await api.delete(`/profile/tokens/${tokenId}`);
      loadTokens();
    } catch { toast.error("Failed to revoke token"); }
  }

  function handleCopyToken() {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setTokenCopied(true);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  const profileDirty = displayName !== (user?.display_name ?? "");

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-8">Profile</h1>

      <form onSubmit={handleProfileSubmit} className="mb-10">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
        {profileMsg && <p className="text-sm text-green-400 mt-3">{profileMsg}</p>}
        {profileErr && <p className="text-sm text-red-400 mt-3">{profileErr}</p>}
        <button
          type="submit"
          disabled={profileSaving || !profileDirty}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {profileSaving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="border-t border-[var(--border)] pt-8">
        <form onSubmit={handlePasswordSubmit}>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
          </div>
          {passwordMsg && <p className="text-sm text-green-400 mt-3">{passwordMsg}</p>}
          {passwordErr && <p className="text-sm text-red-400 mt-3">{passwordErr}</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {passwordSaving ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="border-t border-[var(--border)] pt-8 mt-8">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Email Notifications
        </h2>
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-primary)]">Enable email notifications</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">Receive emails for comments, mentions, and status changes on watched items</div>
            </div>
            <button
              onClick={async () => {
                try {
                  const newVal = !user.email_notifications;
                  await api.patch("/profile", { email_notifications: newVal });
                  await refreshUser();
                } catch { toast.error("Failed to update email notifications"); }
              }}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                user.email_notifications ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)] border border-[var(--border)]"
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                user.email_notifications ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
          {user.email_notifications && (
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Delivery mode</label>
              <select
                value={user.email_digest_mode || "immediate"}
                onChange={async (e) => {
                  try {
                    await api.patch("/profile", { email_digest_mode: e.target.value });
                    await refreshUser();
                  } catch { toast.error("Failed to update delivery mode"); }
                }}
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              >
                <option value="immediate">Send immediately</option>
                <option value="daily">Daily digest</option>
              </select>
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            Email notifications require SMTP to be configured on the server.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-8 mt-8">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          API Tokens
        </h2>

        {createdToken && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-400 font-medium mb-2">
              Token created — copy it now. You won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-[var(--bg-secondary)] px-3 py-2 rounded font-mono text-[var(--text-primary)] overflow-x-auto">
                {createdToken}
              </code>
              <button
                onClick={handleCopyToken}
                className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors shrink-0"
              >
                {tokenCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateToken} className="mb-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Token name</label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g. CI deploy"
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Expires</label>
              <select
                value={newTokenExpiry}
                onChange={(e) => setNewTokenExpiry(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="never">No expiry</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={tokenCreating}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {tokenCreating ? "Creating..." : "Create token"}
            </button>
          </div>
          {tokenErr && <p className="text-sm text-red-400 mt-2">{tokenErr}</p>}
        </form>

        {tokens.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Token</th>
                  <th className="text-left px-3 py-2 font-medium">Created</th>
                  <th className="text-left px-3 py-2 font-medium">Last used</th>
                  <th className="text-left px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-[var(--text-primary)]">{t.name}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs text-[var(--text-secondary)] font-mono">
                        {t.token_prefix}...
                      </code>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{formatDate(t.created_at)}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{formatDate(t.last_used_at)}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{formatDate(t.expires_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleRevokeToken(t.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tokens.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">No API tokens yet.</p>
        )}
      </div>
    </div>
  );
}
