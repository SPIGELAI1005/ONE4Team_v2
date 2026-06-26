import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicClubCard } from "@/components/public-club/public-club-card";
import { useLanguage } from "@/hooks/use-language";
import { readableTextOnSolid } from "@/lib/hex-to-rgb";
import { clubCtaFillHoverClass } from "@/lib/public-club-cta-classes";
import {
  ALLACH_COUNTRIES,
  ALLACH_MEMBERSHIP_TYPES,
  ALLACH_PHONE_CODES,
  emptyTsvAllachMembershipApplication,
  type AllachMembershipTypeId,
  type AllachSalutation,
  type AllachYesNo,
  type TsvAllachMembershipApplication,
} from "@/lib/tsv-allach-membership-application";
import { cn } from "@/lib/utils";

const joinFormLabelClass = "text-neutral-900";
const joinFormInputClass =
  "border-neutral-300 bg-white/95 text-neutral-900 placeholder:text-neutral-500 focus-visible:ring-[color:var(--club-primary)]";

interface TsvAllachMembershipApplicationFormProps {
  clubPrimaryColor?: string | null;
  initialEmail?: string;
  showEmailField?: boolean;
  submitting?: boolean;
  sent?: boolean;
  onSubmit: (app: TsvAllachMembershipApplication) => void | Promise<void>;
  onReset?: () => void;
}

function FormSectionHeader({ title }: { title: string }) {
  return (
    <div className="rounded-t-xl bg-[color:var(--club-primary)] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
      {title}
    </div>
  );
}

function RequiredMark() {
  return <span className="text-red-600"> *</span>;
}

function YesNoField({
  id,
  label,
  value,
  onChange,
  required,
  yesLabel,
  noLabel,
}: {
  id: string;
  label: string;
  value: AllachYesNo | "";
  onChange: (v: AllachYesNo) => void;
  required?: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={cn("text-sm font-medium", joinFormLabelClass)}>
        {label}
        {required ? <RequiredMark /> : null}
      </legend>
      <div className="flex flex-wrap gap-4">
        {(["yes", "no"] as const).map((opt) => (
          <label key={opt} htmlFor={`${id}-${opt}`} className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-900">
            <input
              id={`${id}-${opt}`}
              type="radio"
              name={id}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 accent-red-600"
            />
            {opt === "yes" ? yesLabel : noLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TsvAllachMembershipApplicationForm({
  clubPrimaryColor,
  initialEmail = "",
  showEmailField = true,
  submitting = false,
  sent = false,
  onSubmit,
  onReset,
}: TsvAllachMembershipApplicationFormProps) {
  const { t } = useLanguage();
  const copy = t.tsvAllachApplication;
  const [step, setStep] = useState(0);
  const [app, setApp] = useState<TsvAllachMembershipApplication>(() => emptyTsvAllachMembershipApplication(initialEmail));

  const patch = (partial: Partial<TsvAllachMembershipApplication>) => setApp((prev) => ({ ...prev, ...partial }));

  const membershipLabel = (id: AllachMembershipTypeId) => copy.membershipTypes[id];

  const stepTitles = useMemo(
    () => [copy.sectionPersonal, copy.sectionAddress, copy.sectionPlayer, copy.sectionMembership, copy.sectionPayment],
    [copy],
  );

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        if (!app.salutation || !app.firstName.trim() || !app.lastName.trim()) return false;
        if (app.applicantType === "child" && !app.childFullName.trim()) return false;
        if (!app.birthDate || !app.birthPlace.trim() || !app.mobilePhone.trim()) return false;
        if (showEmailField && (!app.email.trim() || !app.email.includes("@"))) return false;
        return true;
      case 1:
        return Boolean(app.street.trim() && app.postalCode.trim() && app.city.trim() && app.country);
      case 2:
        if (!app.playedInClubBefore || !app.currentlyClubPlayer) return false;
        if (app.playedInClubBefore === "yes" && !app.previousClubName.trim()) return false;
        if (app.currentlyClubPlayer === "yes") {
          if (!app.lastGameDate) return false;
        }
        if (app.currentlyClubPlayer === "yes" && !app.terminationSubmitted) return false;
        return true;
      case 3:
        return Boolean(app.membershipType);
      case 4:
        return (
          app.accountHolder.trim() &&
          app.iban.trim() &&
          app.consentSepa &&
          app.consentRegistrationFee &&
          app.consentStatutes &&
          app.consentMembershipInfo &&
          app.consentPrivacy
        );
      default:
        return false;
    }
  }, [app, showEmailField, step]);

  if (sent) {
    return (
      <PublicClubCard className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-[color:var(--club-primary)]" />
        <h3 className="font-display text-lg font-semibold text-neutral-900">{t.clubPage.joinFormSuccessTitle}</h3>
        <p className="mt-2 text-sm text-neutral-700">{t.clubPage.joinFormSuccessBody}</p>
        {onReset ? (
          <Button type="button" variant="outline" className="mt-6" onClick={onReset}>
            {t.clubPage.joinFormAnother}
          </Button>
        ) : null}
      </PublicClubCard>
    );
  }

  return (
    <PublicClubCard className="overflow-hidden p-0">
      <FormSectionHeader title={stepTitles[step] ?? copy.sectionPersonal} />

      <div className="space-y-4 p-4 sm:p-5">
        {step === 0 ? (
          <>
            <fieldset className="space-y-2">
              <legend className={cn("text-sm font-medium", joinFormLabelClass)}>
                {copy.applicantTypeLabel}
                <RequiredMark />
              </legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {(["self", "child"] as const).map((type) => (
                  <label
                    key={type}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      app.applicantType === type ? "border-red-600 bg-red-600 text-white" : "border-neutral-300 bg-white/95 text-neutral-900",
                    )}
                  >
                    <input
                      type="radio"
                      name="applicantType"
                      className="sr-only"
                      checked={app.applicantType === type}
                      onChange={() => patch({ applicantType: type })}
                    />
                    {type === "self" ? copy.applicantTypeSelf : copy.applicantTypeChild}
                  </label>
                ))}
              </div>
              {app.applicantType === "child" ? (
                <p className="text-xs text-neutral-600">{copy.childAgeHint}</p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className={cn("text-sm font-medium", joinFormLabelClass)}>
                {copy.salutationLabel}
                <RequiredMark />
              </legend>
              <div className="flex gap-4">
                {(["frau", "herr"] as const).map((s) => (
                  <label key={s} className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-900">
                    <input
                      type="radio"
                      name="salutation"
                      checked={app.salutation === s}
                      onChange={() => patch({ salutation: s as AllachSalutation })}
                      className="h-4 w-4 accent-red-600"
                    />
                    {s === "frau" ? copy.salutationFrau : copy.salutationHerr}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.firstNameLabel}<RequiredMark /></Label>
                <Input value={app.firstName} onChange={(e) => patch({ firstName: e.target.value })} className={joinFormInputClass} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.lastNameLabel}<RequiredMark /></Label>
                <Input value={app.lastName} onChange={(e) => patch({ lastName: e.target.value })} className={joinFormInputClass} maxLength={80} />
              </div>
            </div>

            {app.applicantType === "child" ? (
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.childNameLabel}<RequiredMark /></Label>
                <Input
                  value={app.childFullName}
                  onChange={(e) => patch({ childFullName: e.target.value })}
                  placeholder={copy.childNamePlaceholder}
                  className={joinFormInputClass}
                  maxLength={160}
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>
                  {app.applicantType === "child" ? copy.childBirthDateLabel : copy.birthDateLabel}
                  <RequiredMark />
                </Label>
                <Input type="date" value={app.birthDate} onChange={(e) => patch({ birthDate: e.target.value })} className={joinFormInputClass} />
              </div>
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>
                  {app.applicantType === "child" ? copy.childBirthPlaceLabel : copy.birthPlaceLabel}
                  <RequiredMark />
                </Label>
                <Input value={app.birthPlace} onChange={(e) => patch({ birthPlace: e.target.value })} className={joinFormInputClass} maxLength={120} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,7rem)_1fr]">
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.phoneCodeLabel}<RequiredMark /></Label>
                <Select value={app.phoneCountryCode} onValueChange={(v) => patch({ phoneCountryCode: v })}>
                  <SelectTrigger className={joinFormInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLACH_PHONE_CODES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.mobileLabel}<RequiredMark /></Label>
                <Input type="tel" value={app.mobilePhone} onChange={(e) => patch({ mobilePhone: e.target.value })} className={joinFormInputClass} maxLength={40} />
              </div>
            </div>

            {showEmailField ? (
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.emailLabel}<RequiredMark /></Label>
                <Input type="email" value={app.email} onChange={(e) => patch({ email: e.target.value })} className={joinFormInputClass} maxLength={254} />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.streetLabel}<RequiredMark /></Label>
              <Input value={app.street} onChange={(e) => patch({ street: e.target.value })} className={joinFormInputClass} maxLength={200} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.postalCodeLabel}<RequiredMark /></Label>
                <Input value={app.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} className={joinFormInputClass} maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.cityLabel}<RequiredMark /></Label>
                <Input value={app.city} onChange={(e) => patch({ city: e.target.value })} className={joinFormInputClass} maxLength={120} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.countryLabel}<RequiredMark /></Label>
              <Select value={app.country} onValueChange={(v) => patch({ country: v })}>
                <SelectTrigger className={joinFormInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLACH_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{copy.countries[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <YesNoField
              id="played-before"
              label={copy.playedBeforeQuestion}
              value={app.playedInClubBefore}
              onChange={(v) => patch({ playedInClubBefore: v, ...(v === "no" ? { previousClubName: "" } : {}) })}
              required
              yesLabel={copy.yes}
              noLabel={copy.no}
            />
            {app.playedInClubBefore === "yes" ? (
              <div className="space-y-2">
                <Label className={joinFormLabelClass}>{copy.previousClubLabel}<RequiredMark /></Label>
                <Input value={app.previousClubName} onChange={(e) => patch({ previousClubName: e.target.value })} className={joinFormInputClass} maxLength={160} />
              </div>
            ) : null}

            <YesNoField
              id="current-player"
              label={copy.currentPlayerQuestion}
              value={app.currentlyClubPlayer}
              onChange={(v) =>
                patch({
                  currentlyClubPlayer: v,
                  ...(v === "no" ? { playerPassNumber: "", lastGameDate: "", terminationSubmitted: "" } : {}),
                })
              }
              required
              yesLabel={copy.yes}
              noLabel={copy.no}
            />
            {app.currentlyClubPlayer === "yes" ? (
              <>
                <div className="space-y-2">
                  <Label className={joinFormLabelClass}>{copy.playerPassLabel}</Label>
                  <Input value={app.playerPassNumber} onChange={(e) => patch({ playerPassNumber: e.target.value })} className={joinFormInputClass} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label className={joinFormLabelClass}>{copy.lastGameLabel}<RequiredMark /></Label>
                  <Input type="date" value={app.lastGameDate} onChange={(e) => patch({ lastGameDate: e.target.value })} className={joinFormInputClass} />
                </div>
                <YesNoField
                  id="termination"
                  label={copy.terminationQuestion}
                  value={app.terminationSubmitted}
                  onChange={(v) => patch({ terminationSubmitted: v })}
                  required
                  yesLabel={copy.yes}
                  noLabel={copy.no}
                />
                {app.terminationSubmitted === "yes" ? (
                  <p className="text-xs text-neutral-600">{copy.terminationUploadHint}</p>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.membershipTypeLabel}<RequiredMark /></Label>
              <Select value={app.membershipType || undefined} onValueChange={(v) => patch({ membershipType: v })}>
                <SelectTrigger className={joinFormInputClass}>
                  <SelectValue placeholder={copy.membershipTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ALLACH_MEMBERSHIP_TYPES.map((id) => (
                    <SelectItem key={id} value={id}>{membershipLabel(id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-neutral-700">{copy.membershipFeeNote}</p>
            <p className="text-xs text-neutral-600">{copy.trainerNote}</p>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.additionalCommentsLabel}</Label>
              <textarea
                value={app.additionalComments}
                onChange={(e) => patch({ additionalComments: e.target.value })}
                rows={4}
                maxLength={800}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 ${joinFormInputClass}`}
              />
            </div>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.voucherLabel}</Label>
              <Input
                value={app.voucherCode}
                onChange={(e) => patch({ voucherCode: e.target.value })}
                placeholder={copy.voucherPlaceholder}
                className={joinFormInputClass}
                maxLength={40}
              />
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="text-sm text-neutral-700">{copy.paymentIntro}</p>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.accountHolderLabel}<RequiredMark /></Label>
              <Input
                value={app.accountHolder}
                onChange={(e) => patch({ accountHolder: e.target.value })}
                placeholder={copy.accountHolderPlaceholder}
                className={joinFormInputClass}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.ibanLabel}<RequiredMark /></Label>
              <Input value={app.iban} onChange={(e) => patch({ iban: e.target.value.toUpperCase() })} className={joinFormInputClass} maxLength={34} />
            </div>
            <div className="space-y-2">
              <Label className={joinFormLabelClass}>{copy.bankNameLabel}</Label>
              <Input value={app.bankName} onChange={(e) => patch({ bankName: e.target.value })} className={joinFormInputClass} maxLength={120} />
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4">
              {(
                [
                  ["consentSepa", copy.consentSepa],
                  ["consentRegistrationFee", copy.consentRegistrationFee],
                  ["consentStatutes", copy.consentStatutes],
                  ["consentMembershipInfo", copy.consentMembershipInfo],
                  ["consentPrivacy", copy.consentPrivacy],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-start gap-3">
                  <Checkbox
                    id={key}
                    checked={app[key]}
                    onCheckedChange={(v) => patch({ [key]: v === true })}
                    className="mt-0.5 border-neutral-400 data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor={key} className="cursor-pointer text-sm leading-snug text-red-600">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <p className="text-xs text-neutral-500">{copy.requiredFieldNote}</p>

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="border-neutral-300 text-neutral-900">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {copy.btnBack}
            </Button>
          ) : (
            <span />
          )}
          {step < stepTitles.length - 1 ? (
            <Button
              type="button"
              disabled={!canAdvance}
              className={`font-semibold ${clubCtaFillHoverClass}`}
              style={{
                backgroundColor: "var(--club-primary)",
                color: readableTextOnSolid(clubPrimaryColor || "#C4A052"),
              }}
              onClick={() => setStep((s) => s + 1)}
            >
              {copy.btnNext}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canAdvance || submitting}
              className={`font-semibold ${clubCtaFillHoverClass}`}
              style={{
                backgroundColor: "var(--club-primary)",
                color: readableTextOnSolid(clubPrimaryColor || "#C4A052"),
              }}
              onClick={() => void onSubmit(app)}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.clubPage.joinFormSending}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {copy.btnSubmit}
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex justify-center gap-1.5">
          {stepTitles.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-6 rounded-full transition-colors", i === step ? "bg-red-600" : i < step ? "bg-neutral-400" : "bg-neutral-200")}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </PublicClubCard>
  );
}
