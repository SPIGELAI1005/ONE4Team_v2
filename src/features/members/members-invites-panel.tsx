import type { ReactNode } from "react";

interface MembersInvitesPanelProps {
  children: ReactNode;
}

/**
 * Invites tab shell for `/members`. Content remains owned by Members.tsx during the
 * incremental split; this module establishes the feature boundary.
 */
export function MembersInvitesPanel({ children }: MembersInvitesPanelProps) {
  return <div className="space-y-4">{children}</div>;
}
