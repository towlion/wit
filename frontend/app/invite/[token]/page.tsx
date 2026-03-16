"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface InviteInfo {
  workspace_name: string;
  role: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<InviteInfo>(`/invites/${token}`)
      .then(setInfo)
      .catch((e) => setError(e.message || "Invalid or expired invite"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      await api.post(`/invites/${token}/accept`);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept invite");
    }
    setAccepting(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <span className="text-sm text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-sm w-full p-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-6 mx-auto shadow-sm shadow-indigo-500/20">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <h1 className="text-lg font-semibold text-center mb-2">Sign in to accept invite</h1>
          <p className="text-sm text-[var(--text-muted)] text-center mb-6">
            You need to be signed in to accept this workspace invitation.
          </p>
          <a href="/login" className="btn-primary block text-center">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-sm w-full p-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-6 mx-auto shadow-sm shadow-indigo-500/20">
          <span className="text-white font-bold text-xs">W</span>
        </div>

        {error && !info ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold mb-2">Invite not available</h1>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : info ? (
          <>
            <h1 className="text-lg font-semibold text-center mb-2">
              Join {info.workspace_name}
            </h1>
            <p className="text-sm text-[var(--text-muted)] text-center mb-6">
              You&apos;ve been invited to join as <strong className="text-[var(--text-primary)]">{info.role}</strong>
            </p>

            {error && (
              <div className="bg-[var(--danger-subtle)] border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="btn-primary w-full"
            >
              {accepting ? "Joining..." : "Accept invitation"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
