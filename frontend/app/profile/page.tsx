"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

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
          disabled={profileSaving}
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
    </div>
  );
}
