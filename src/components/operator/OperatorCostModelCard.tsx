import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPERATOR_CARD_CLASS } from "@/components/operator/OperatorPageShell";
import { useLanguage } from "@/hooks/use-language";
import {
  COST_DRIVER_FIELDS,
  DEFAULT_COST_MODEL,
  areCostModelsEqual,
  computeDevelopmentCost,
  createCostLineItem,
  formatEur,
  type CostLineItem,
  type CostModel,
  type CostModelChangeLogEntry,
  type DevelopmentCostMethod,
  type DevelopmentModel,
} from "@/lib/operator-financials";

interface OperatorCostModelCardProps {
  model: CostModel;
  onChange: (next: CostModel) => void;
  onReset: () => void;
  comment: string;
  onCommentChange: (value: string) => void;
  onSave: () => void;
  isDirty: boolean;
  lastSavedAt: string | null;
  changeHistory: CostModelChangeLogEntry[];
  formatSavedAt: (iso: string) => string;
}

export function OperatorCostModelCard({
  model,
  onChange,
  onReset,
  comment,
  onCommentChange,
  onSave,
  isDirty,
  lastSavedAt,
  changeHistory,
  formatSavedAt,
}: OperatorCostModelCardProps) {
  const { t } = useLanguage();
  const f = t.operator.financials;
  const shell = t.operator.shell;

  const unitSuffix: Record<string, string> = {
    eur: f.costUnits.eur,
    "eur-per-club": f.costUnits.eurPerClub,
    "eur-per-user": f.costUnits.eurPerUser,
    percent: f.costUnits.percent,
  };

  const isDefault = areCostModelsEqual(model, DEFAULT_COST_MODEL) && !comment.trim();

  function updateFixedItem(id: string, patch: Partial<CostLineItem>) {
    onChange({
      ...model,
      fixedItems: model.fixedItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function removeFixedItem(id: string) {
    onChange({ ...model, fixedItems: model.fixedItems.filter((item) => item.id !== id) });
  }

  function addFixedItem() {
    onChange({ ...model, fixedItems: [...model.fixedItems, createCostLineItem("", 0)] });
  }

  function updateDevelopment(patch: Partial<DevelopmentModel>) {
    onChange({ ...model, development: { ...model.development, ...patch } });
  }

  const development = computeDevelopmentCost(model);

  return (
    <Card className={OPERATOR_CARD_CLASS}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="font-display text-base">{f.costModelTitle}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{f.costModelDesc}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} disabled={isDefault && !isDirty}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {shell.reset}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {f.fixedSubscriptionsTitle}
            </p>
            <Button variant="outline" size="sm" onClick={addFixedItem}>
              <Plus className="mr-2 h-4 w-4" />
              {f.addTool}
            </Button>
          </div>

          {model.fixedItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              {f.noToolsYet}
            </p>
          ) : (
            <div className="space-y-2">
              {model.fixedItems.map((item) => (
                <div key={item.id} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor={`tool-name-${item.id}`} className="text-xs text-muted-foreground">
                      {f.toolNameLabel}
                    </Label>
                    <Input
                      id={`tool-name-${item.id}`}
                      value={item.name}
                      placeholder={f.toolNamePlaceholder}
                      onChange={(event) => updateFixedItem(item.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="w-32 shrink-0 space-y-1.5">
                    <Label htmlFor={`tool-amount-${item.id}`} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{f.toolAmountLabel}</span>
                      <span>{f.costUnits.eur}</span>
                    </Label>
                    <Input
                      id={`tool-amount-${item.id}`}
                      type="number"
                      min={0}
                      step={5}
                      value={Number.isFinite(item.monthly) ? item.monthly : 0}
                      onChange={(event) =>
                        updateFixedItem(item.id, { monthly: Math.max(0, Number(event.target.value) || 0) })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFixedItem(item.id)}
                    aria-label={f.removeTool}
                    title={f.removeTool}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border/60 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.usageDriversTitle}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {COST_DRIVER_FIELDS.map((field) => {
              const copy = f.costFields[field.key];
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`cost-${field.key}`} className="flex items-center justify-between gap-2">
                    <span>{copy.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{unitSuffix[field.unit]}</span>
                  </Label>
                  <Input
                    id={`cost-${field.key}`}
                    type="number"
                    min={0}
                    step={field.step}
                    value={Number.isFinite(model[field.key]) ? model[field.key] : 0}
                    onChange={(event) =>
                      onChange({ ...model, [field.key]: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                  <p className="text-xs leading-4 text-muted-foreground">{copy.hint}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {f.developmentSectionTitle}
            </p>
            <p className="text-xs leading-4 text-muted-foreground">{f.developmentSectionHint}</p>
          </div>

          <div className="inline-flex rounded-lg border border-border/60 p-0.5">
            {(["loc", "effort"] as DevelopmentCostMethod[]).map((method) => (
              <Button
                key={method}
                type="button"
                variant={model.development.method === method ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => updateDevelopment({ method })}
              >
                {method === "loc" ? f.developmentMethodLoc : f.developmentMethodEffort}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="dev-loc" className="flex items-center justify-between gap-2">
                <span>{f.developmentLinesLabel}</span>
                <span className="text-xs font-normal text-muted-foreground">{f.developmentUnitLines}</span>
              </Label>
              <Input
                id="dev-loc"
                type="number"
                min={0}
                step={1000}
                value={Number.isFinite(model.development.linesOfCode) ? model.development.linesOfCode : 0}
                onChange={(event) => updateDevelopment({ linesOfCode: Math.max(0, Number(event.target.value) || 0) })}
              />
              <p className="text-xs leading-4 text-muted-foreground">{f.developmentLinesHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-cost-per-line" className="flex items-center justify-between gap-2">
                <span>{f.developmentCostPerLineLabel}</span>
                <span className="text-xs font-normal text-muted-foreground">{f.developmentUnitEurPerLine}</span>
              </Label>
              <Input
                id="dev-cost-per-line"
                type="number"
                min={0}
                step={0.5}
                value={Number.isFinite(model.development.costPerLine) ? model.development.costPerLine : 0}
                onChange={(event) => updateDevelopment({ costPerLine: Math.max(0, Number(event.target.value) || 0) })}
              />
              <p className="text-xs leading-4 text-muted-foreground">{f.developmentCostPerLineHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-days" className="flex items-center justify-between gap-2">
                <span>{f.developmentDaysLabel}</span>
                <span className="text-xs font-normal text-muted-foreground">{f.developmentUnitDays}</span>
              </Label>
              <Input
                id="dev-days"
                type="number"
                min={0}
                step={10}
                value={Number.isFinite(model.development.personDays) ? model.development.personDays : 0}
                onChange={(event) => updateDevelopment({ personDays: Math.max(0, Number(event.target.value) || 0) })}
              />
              <p className="text-xs leading-4 text-muted-foreground">{f.developmentDaysHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-rate" className="flex items-center justify-between gap-2">
                <span>{f.developmentDailyRateLabel}</span>
                <span className="text-xs font-normal text-muted-foreground">{f.developmentUnitEurPerDay}</span>
              </Label>
              <Input
                id="dev-rate"
                type="number"
                min={0}
                step={50}
                value={Number.isFinite(model.development.dailyRate) ? model.development.dailyRate : 0}
                onChange={(event) => updateDevelopment({ dailyRate: Math.max(0, Number(event.target.value) || 0) })}
              />
              <p className="text-xs leading-4 text-muted-foreground">{f.developmentDailyRateHint}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {f.developmentEstimateSummary
              .replace("{method}", development.method === "effort" ? f.developmentMethodEffort : f.developmentMethodLoc)
              .replace("{total}", formatEur(development.total))}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="cost-model-comment">{f.costModelCommentLabel}</Label>
            <Textarea
              id="cost-model-comment"
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder={f.costModelCommentPlaceholder}
              className="min-h-[96px] resize-y text-sm"
            />
            <p className="text-xs text-muted-foreground">{f.costModelCommentHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onSave} disabled={!isDirty}>
              <Save className="mr-2 h-4 w-4" />
              {f.costModelSave}
            </Button>
            {isDirty ? (
              <Badge variant="secondary">{f.costModelUnsaved}</Badge>
            ) : lastSavedAt ? (
              <span className="text-xs text-muted-foreground">
                {f.costModelLastSaved.replace("{timestamp}", formatSavedAt(lastSavedAt))}
              </span>
            ) : null}
          </div>

          {changeHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.costModelHistoryTitle}</p>
              <ul className="space-y-2">
                {changeHistory.slice(0, 5).map((entry) => (
                  <li
                    key={entry.savedAt}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">{formatSavedAt(entry.savedAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap">{entry.comment.trim() || f.costModelHistoryNoComment}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
