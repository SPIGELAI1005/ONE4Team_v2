import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CreditCard, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OperatorIntegrationBadge } from "@/components/operator/OperatorIntegrationBadge";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useMonitoringConnectors, usePlatformSettings } from "@/hooks/use-operator-enhancements";
import { localizeMonitoringConnectorLabel, setPlatformSetting } from "@/lib/operator-enhancements";

interface SettingsTabProps {
  canEdit: boolean;
}

export function OperatorControlCenterSettingsTab({ canEdit }: SettingsTabProps) {
  const { t } = useLanguage();
  const cc = t.operator.settingsPage.controlCenter;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = usePlatformSettings();
  const defaults = data?.control_center_defaults;
  const [supportEmail, setSupportEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [defaultPlanKey, setDefaultPlanKey] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (defaults) {
      setSupportEmail(defaults.support_contact_email ?? "");
      setBillingEmail(defaults.billing_contact_email ?? "");
      setDefaultPlanKey(defaults.default_plan_key ?? "");
    }
  }, [defaults]);

  const mutation = useMutation({
    mutationFn: async () =>
      setPlatformSetting({
        key: "control_center_defaults",
        value: {
          default_plan_key: defaultPlanKey.trim() || null,
          trial_module_keys: defaults?.trial_module_keys ?? [],
          support_contact_email: supportEmail.trim() || null,
          billing_contact_email: billingEmail.trim() || null,
        },
        reason: reason.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: cc.toast.saved });
      setReason("");
    },
    onError: (error: Error) => {
      toast({ title: cc.toast.saveFailed, description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />;
  }

  const currentPlan = defaults?.default_plan_key ?? "";
  const pd = cc.platformDefaults;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{pd.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-plan-key">{pd.defaultPlan}</Label>
            <Input
              id="default-plan-key"
              placeholder={currentPlan || "starter"}
              value={defaultPlanKey}
              onChange={(event) => setDefaultPlanKey(event.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">{pd.supportEmail}</Label>
            <Input
              id="support-email"
              type="email"
              placeholder={pd.supportEmailPlaceholder}
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-email">{pd.billingEmail}</Label>
            <Input
              id="billing-email"
              type="email"
              placeholder={pd.billingEmailPlaceholder}
              value={billingEmail}
              onChange={(event) => setBillingEmail(event.target.value)}
              disabled={!canEdit}
            />
          </div>
          {canEdit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="defaults-reason">{pd.reason}</Label>
                <Textarea
                  id="defaults-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={pd.reasonPlaceholder}
                />
              </div>
              <Button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}>
                {pd.save}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{pd.ownerOnly}</p>
          )}
        </CardContent>
      </Card>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="font-display text-base">{cc.trialBundle.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{cc.trialBundle.description}</p>
          </div>
          <OperatorIntegrationBadge connected={Boolean((defaults?.trial_module_keys ?? []).length)} />
        </CardHeader>
        <CardContent>
          <OperatorSectionEmptyState
            icon={CreditCard}
            title={cc.trialBundle.emptyTitle}
            description={cc.trialBundle.emptyDesc}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function OperatorDataSecurityTab({ canEdit }: SettingsTabProps) {
  const { t } = useLanguage();
  const ds = t.operator.settingsPage.dataSecurity;
  const { data, isLoading } = usePlatformSettings();
  const { data: connectors } = useMonitoringConnectors();
  const security = data?.data_security;
  const alerts = data?.alert_policies;

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />;
  }

  const deliveryChannel = alerts?.delivery_channel ?? "none";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{ds.auditRetention.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold text-foreground">{security?.audit_retention_days ?? 365}</p>
            <p className="mt-2 text-sm text-muted-foreground">{ds.auditRetention.hint}</p>
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="font-display text-base">{ds.impersonation.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{ds.impersonation.description}</p>
            </div>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{ds.impersonation.enabled}</span>
              <Switch checked={Boolean(security?.support_impersonation_enabled)} disabled />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{ds.impersonation.requiresReason}</span>
              <Switch checked={Boolean(security?.support_impersonation_requires_reason)} disabled />
            </div>
            {!canEdit ? <p className="text-xs text-muted-foreground">{ds.impersonation.ownerOnly}</p> : null}
          </CardContent>
        </Card>

        <Card className={OPERATOR_CARD_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{ds.alertPolicies.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <PolicyRow label={ds.alertPolicies.ownerRoleChanges} enabled={Boolean(alerts?.notify_on_owner_role_change)} />
            <PolicyRow label={ds.alertPolicies.clubSuspended} enabled={Boolean(alerts?.notify_on_club_suspended)} />
            <PolicyRow label={ds.alertPolicies.failedInviteSpike} enabled={Boolean(alerts?.notify_on_failed_invite_spike)} />
            <div className="pt-2 text-muted-foreground">
              {ds.alertPolicies.delivery}:{" "}
              <Badge variant="outline">
                {deliveryChannel === "none" ? ds.alertPolicies.none : deliveryChannel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={OPERATOR_CARD_CLASS}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="font-display text-base">{ds.monitoring.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{ds.monitoring.description}</p>
          </div>
          <Bell className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(connectors ?? {}).map(([key, connector]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 p-3">
              <span className="text-sm font-medium text-foreground">
                {localizeMonitoringConnectorLabel(key, t)}
              </span>
              <OperatorIntegrationBadge connected={connector.connected} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyRow({ label, enabled }: { label: string; enabled: boolean }) {
  const { t } = useLanguage();
  const toggle = t.operator.settingsPage.dataSecurity.toggle;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={enabled ? "default" : "outline"}>{enabled ? toggle.on : toggle.off}</Badge>
    </div>
  );
}
