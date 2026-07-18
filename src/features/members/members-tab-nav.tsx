import { Inbox, Shield, Users } from "lucide-react";
import { DASHBOARD_TAB_BUTTON, DASHBOARD_TABS_INNER_SCROLL, DASHBOARD_TABS_ROW } from "@/lib/dashboard-page-shell";

export type MembersPageTab = "members" | "invites" | "roles";

interface MembersTabNavProps {
  tab: MembersPageTab;
  onTabChange: (tab: MembersPageTab) => void;
  showRoles: boolean;
  labels: {
    members: string;
    invites: string;
    roles: string;
  };
}

export function MembersTabNav({ tab, onTabChange, showRoles, labels }: MembersTabNavProps) {
  return (
    <div className={DASHBOARD_TABS_ROW}>
      <div className={DASHBOARD_TABS_INNER_SCROLL}>
        <button
          type="button"
          onClick={() => onTabChange("members")}
          className={`${DASHBOARD_TAB_BUTTON} ${
            tab === "members" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" /> {labels.members}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("invites")}
          className={`${DASHBOARD_TAB_BUTTON} ${
            tab === "invites" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4" /> {labels.invites}
        </button>
        {showRoles ? (
          <button
            type="button"
            onClick={() => onTabChange("roles")}
            className={`${DASHBOARD_TAB_BUTTON} ${
              tab === "roles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" /> {labels.roles}
          </button>
        ) : null}
      </div>
    </div>
  );
}
