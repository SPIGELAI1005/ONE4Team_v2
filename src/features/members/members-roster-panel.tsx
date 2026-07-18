import type { ReactNode } from "react";

interface MembersRosterPanelProps {
  toolbar: ReactNode;
  children: ReactNode;
}

/**
 * Roster tab shell — keeps search/filter toolbar and list body as composition slots
 * so Members.tsx can migrate content incrementally without behavior changes.
 */
export function MembersRosterPanel({ toolbar, children }: MembersRosterPanelProps) {
  return (
    <div className="space-y-4">
      {toolbar}
      {children}
    </div>
  );
}
