import { usePlatformSettings } from "@/hooks/use-operator-enhancements";

export function OperatorAlertsBanner() {
  const { data } = usePlatformSettings();
  const policies = data?.alert_policies;

  if (!policies || policies.delivery_channel === "none") {
    return null;
  }

  const enabledRules = [
    policies.notify_on_owner_role_change ? "OWNER role changes" : null,
    policies.notify_on_club_suspended ? "Club suspensions" : null,
    policies.notify_on_failed_invite_spike ? "Failed invite spikes" : null,
  ].filter(Boolean);

  if (!enabledRules.length) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-900 dark:text-amber-100 sm:px-6 lg:px-8">
      Alert policies active ({policies.delivery_channel}): {enabledRules.join(" · ")}. Delivery integrations ship in a
      later phase — audit trail remains the source of truth today.
    </div>
  );
}
