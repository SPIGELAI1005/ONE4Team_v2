import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LayoutDashboard, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLanguage } from "@/hooks/use-language";
import { useOperatorClubs } from "@/hooks/use-operator-clubs";
import { getOperatorNavItems } from "@/lib/operator-nav";
import { hasOperatorPermission } from "@/lib/operator-permissions";
import { useOperatorAccess } from "@/hooks/use-operator-access";

interface OperatorCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperatorCommandPalette({ open, onOpenChange }: OperatorCommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { access } = useOperatorAccess();
  const { data: clubs = [] } = useOperatorClubs();
  const cp = t.operator.commandPalette;

  const navItems = useMemo(
    () => getOperatorNavItems(t).filter((item) => hasOperatorPermission(access, item.permission)),
    [access, t],
  );

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={cp.placeholder} />
      <CommandList>
        <CommandEmpty>{cp.empty}</CommandEmpty>
        <CommandGroup heading={cp.navigate}>
          {navItems.map((item) => (
            <CommandItem key={item.id} onSelect={() => go(item.path)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={cp.clubs}>
          {clubs.slice(0, 12).map((club) => (
            <CommandItem key={club.id} onSelect={() => go(`/operator/clubs/${club.id}`)}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>{club.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{club.slug}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={cp.quickActions}>
          <CommandItem onSelect={() => go("/operator/clubs?status=SUSPENDED")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {cp.suspendedClubs}
          </CommandItem>
          <CommandItem onSelect={() => go("/operator/issues")}>
            <Search className="mr-2 h-4 w-4" />
            {cp.openIssues}
          </CommandItem>
          <CommandItem onSelect={() => go("/operator/support")}>
            <Search className="mr-2 h-4 w-4" />
            {cp.supportDiagnostics}
          </CommandItem>
          <CommandItem onSelect={() => go("/operator/audit")}>
            <Search className="mr-2 h-4 w-4" />
            {cp.auditTrail}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
