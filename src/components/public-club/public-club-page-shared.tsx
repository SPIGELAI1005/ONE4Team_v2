import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const publicClubScrollRowClass =
  "flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden";

interface PublicClubSectionSearchBarProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function PublicClubSectionSearchBar({ id, value, onChange, placeholder }: PublicClubSectionSearchBarProps) {
  return (
    <div className="relative mx-auto mb-5 max-w-md sm:mb-7">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--club-muted)]"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 min-h-[44px] rounded-full border-[color:var(--club-border)] bg-[color:var(--club-card)] pl-9 text-base text-[color:var(--club-foreground)] shadow-sm placeholder:text-[color:var(--club-muted)]"
      />
    </div>
  );
}
