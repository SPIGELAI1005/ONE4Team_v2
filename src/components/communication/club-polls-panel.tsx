import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  closeClubPoll,
  createClubPoll,
  listClubPolls,
  listPollOptions,
  listPollVotes,
  voteClubPoll,
} from "@/lib/club-polls-api";
import {
  isPollOpen,
  myPollOptionIds,
  tallyPollVotes,
  type ClubPollOptionRow,
  type ClubPollRow,
  type ClubPollVoteRow,
} from "@/lib/club-polls";

interface ClubPollsPanelProps {
  clubId: string;
  membershipId: string | null;
  canManage: boolean;
  labels: {
    title: string;
    subtitle: string;
    create: string;
    empty: string;
    vote: string;
    close: string;
    closed: string;
    optionsHint: string;
    titleLabel: string;
    optionPlaceholder: string;
    allowMulti: string;
    saved: string;
    failed: string;
    votesCount: string;
  };
  onToast: (input: { title: string; description?: string; variant?: "destructive" }) => void;
}

export function ClubPollsPanel({
  clubId,
  membershipId,
  canManage,
  labels,
  onToast,
}: ClubPollsPanelProps) {
  const [polls, setPolls] = useState<ClubPollRow[]>([]);
  const [options, setOptions] = useState<ClubPollOptionRow[]>([]);
  const [votes, setVotes] = useState<ClubPollVoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionLines, setOptionLines] = useState("Yes\nNo");
  const [allowMulti, setAllowMulti] = useState(false);
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [selectedByPoll, setSelectedByPoll] = useState<Record<string, string[]>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    const pollsRes = await listClubPolls(clubId);
    if (pollsRes.error) {
      onToast({ title: labels.failed, description: pollsRes.error.message, variant: "destructive" });
      setPolls([]);
      setOptions([]);
      setVotes([]);
      setLoading(false);
      return;
    }
    const ids = pollsRes.data.map((p) => p.id);
    const [optsRes, votesRes] = await Promise.all([listPollOptions(ids), listPollVotes(ids)]);
    setPolls(pollsRes.data);
    setOptions(optsRes.data);
    setVotes(votesRes.data);
    const nextSelected: Record<string, string[]> = {};
    for (const poll of pollsRes.data) {
      nextSelected[poll.id] = myPollOptionIds({
        votes: votesRes.data.filter((v) => v.poll_id === poll.id),
        membershipId,
      });
    }
    setSelectedByPoll(nextSelected);
    setLoading(false);
  }, [clubId, labels.failed, membershipId, onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!clubId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void reload();
      }, 400);
    };

    const channel = supabase
      .channel(`club-polls-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_polls", filter: `club_id=eq.${clubId}` },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_poll_votes", filter: `club_id=eq.${clubId}` },
        scheduleReload,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [clubId, reload]);

  const optionsByPoll = useMemo(() => {
    const map = new Map<string, ClubPollOptionRow[]>();
    for (const option of options) {
      const list = map.get(option.poll_id) ?? [];
      list.push(option);
      map.set(option.poll_id, list);
    }
    return map;
  }, [options]);

  async function handleCreate() {
    const opts = optionLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const result = await createClubPoll({
      clubId,
      title,
      description: description.trim() || null,
      allowMulti,
      options: opts,
    });
    if (result.error || !result.pollId) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    setShowCreate(false);
    setTitle("");
    setDescription("");
    setOptionLines("Yes\nNo");
    setAllowMulti(false);
    await reload();
  }

  function toggleOption(poll: ClubPollRow, optionId: string) {
    setSelectedByPoll((prev) => {
      const current = prev[poll.id] ?? [];
      if (poll.allow_multi) {
        return {
          ...prev,
          [poll.id]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [poll.id]: [optionId] };
    });
  }

  async function handleVote(pollId: string) {
    const optionIds = selectedByPoll[pollId] ?? [];
    if (!optionIds.length) return;
    setBusyPollId(pollId);
    const result = await voteClubPoll({ pollId, optionIds });
    setBusyPollId(null);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    onToast({ title: labels.saved });
    await reload();
  }

  async function handleClose(pollId: string) {
    setBusyPollId(pollId);
    const result = await closeClubPoll(pollId);
    setBusyPollId(null);
    if (!result.ok) {
      onToast({ title: labels.failed, description: result.error ?? undefined, variant: "destructive" });
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-4" data-testid="club-polls-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            {labels.title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{labels.subtitle}</p>
        </div>
        {canManage ? (
          <Button size="sm" className="rounded-2xl shrink-0" data-testid="polls-create-open" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            {labels.create}
          </Button>
        ) : null}
      </div>

      {showCreate ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{labels.titleLabel}</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{labels.optionsHint}</div>
            <Textarea value={optionLines} onChange={(e) => setOptionLines(e.target.value)} className="min-h-[80px]" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={allowMulti} onCheckedChange={(c) => setAllowMulti(c === true)} />
            {labels.allowMulti}
          </label>
          <Button className="rounded-2xl" onClick={() => void handleCreate()} disabled={!title.trim()}>
            {labels.create}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : polls.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => {
            const pollOptions = optionsByPoll.get(poll.id) ?? [];
            const pollVotes = votes.filter((v) => v.poll_id === poll.id);
            const tallies = tallyPollVotes({ options: pollOptions, votes: pollVotes });
            const open = isPollOpen(poll);
            const selected = selectedByPoll[poll.id] ?? [];

            return (
              <div key={poll.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">{poll.title}</div>
                    {poll.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{poll.description}</p>
                    ) : null}
                  </div>
                  {!open ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.closed}</span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {tallies.map((row) => {
                    const checked = selected.includes(row.optionId);
                    return (
                      <button
                        key={row.optionId}
                        type="button"
                        disabled={!open}
                        onClick={() => toggleOption(poll, row.optionId)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          checked
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/60 bg-background/40 text-foreground hover:bg-muted/30"
                        } ${!open ? "opacity-70" : ""}`}
                      >
                        <span>{row.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {labels.votesCount.replace("{count}", String(row.count))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {open ? (
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={busyPollId === poll.id || selected.length === 0}
                      data-testid="polls-vote-submit"
                      onClick={() => void handleVote(poll.id)}
                    >
                      {labels.vote}
                    </Button>
                  ) : null}
                  {canManage && open ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={busyPollId === poll.id}
                      onClick={() => void handleClose(poll.id)}
                    >
                      {labels.close}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
