import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, MessageSquareWarning, Pencil, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OperatorSectionEmptyState } from "@/components/operator/OperatorSectionEmptyState";
import { useOperatorClubSupportNotes } from "@/hooks/use-operator-club-support-notes";
import { useToast } from "@/hooks/use-toast";
import {
  archiveOperatorSupportNote,
  categoryBadgeVariant,
  createOperatorSupportNote,
  formatOverviewTimestamp,
  formatSupportNoteCategory,
  SUPPORT_NOTE_CATEGORIES,
  updateOperatorSupportNote,
  type OperatorSupportNote,
  type SupportNoteCategory,
} from "@/lib/operator-support-notes";

const ALL_CATEGORIES = "__all__";

interface OperatorClubSupportNotesTabProps {
  clubId: string;
  clubName: string;
}

export function OperatorClubSupportNotesTab({ clubId, clubName }: OperatorClubSupportNotesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState<SupportNoteCategory>("general");
  const [editingNote, setEditingNote] = useState<OperatorSupportNote | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<OperatorSupportNote | null>(null);

  const filters = useMemo(
    () => ({
      category: categoryFilter === ALL_CATEGORIES ? null : categoryFilter,
      includeArchived,
    }),
    [categoryFilter, includeArchived],
  );

  const { data, isLoading, isError, error } = useOperatorClubSupportNotes(clubId, filters);
  const notes = data?.notes ?? [];

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["operator-club-support-notes", clubId] });
    await queryClient.invalidateQueries({ queryKey: ["operator-club-detail", clubId] });
    await queryClient.invalidateQueries({ queryKey: ["operator-audit-trail"] });
  };

  const createMutation = useMutation({
    mutationFn: createOperatorSupportNote,
    onSuccess: async () => {
      await invalidate();
      setNoteText("");
      setNoteCategory("general");
      setShowComposer(false);
      toast({ title: "Support note added" });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Unable to add note", description: mutationError.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOperatorSupportNote,
    onSuccess: async () => {
      await invalidate();
      setEditingNote(null);
      toast({ title: "Support note updated" });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Unable to update note", description: mutationError.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveOperatorSupportNote,
    onSuccess: async () => {
      await invalidate();
      setArchiveTarget(null);
      toast({ title: "Support note archived" });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Unable to archive note", description: mutationError.message, variant: "destructive" });
    },
  });

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="font-display text-lg text-destructive">Unable to load support notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Support notes could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">Support notes</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Internal ONE4Team notes for {clubName}. These notes are never visible to club users.
            </p>
          </div>
          {data?.can_create ? (
            <Button onClick={() => setShowComposer((value) => !value)}>
              <Plus className="mr-2 h-4 w-4" />
              Add note
            </Button>
          ) : null}
        </CardHeader>

        {showComposer && data?.can_create ? (
          <CardContent className="border-t border-border/60 pt-5">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate({ clubId, note: noteText, category: noteCategory });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={noteCategory} onValueChange={(value) => setNoteCategory(value as SupportNoteCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_NOTE_CATEGORIES.map((category) => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-note-text">Note</Label>
                  <Textarea
                    id="support-note-text"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Add internal operator context for this club…"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowComposer(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !noteText.trim()}>
                  Save note
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 sm:w-64">
              <Label>Filter by category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                  {SUPPORT_NOTE_CATEGORIES.map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data?.can_view_archived ? (
              <div className="flex items-center gap-2">
                <Switch id="include-archived-notes" checked={includeArchived} onCheckedChange={setIncludeArchived} />
                <Label htmlFor="include-archived-notes">Include archived</Label>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : notes.length === 0 ? (
            <OperatorSectionEmptyState
              icon={MessageSquareWarning}
              title="No support notes yet"
              description={
                data?.can_create
                  ? "Add the first internal note to capture billing context, onboarding progress, or support history."
                  : "Support notes will appear here once operators add internal context for this club."
              }
            />
          ) : (
            <ol className="relative space-y-6 border-l border-border/70 pl-6">
              {notes.map((note) => (
                <li key={note.id} className="relative">
                  <span className="absolute -left-[1.84rem] top-2 flex h-3 w-3 rounded-full border border-background bg-primary" />
                  <div
                    className={`rounded-2xl border p-4 ${
                      note.is_archived ? "border-border/50 bg-muted/20 opacity-80" : "border-border/70 bg-background/60"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={categoryBadgeVariant(note.category)}>
                            {formatSupportNoteCategory(note.category)}
                          </Badge>
                          {note.is_archived ? <Badge variant="secondary">Archived</Badge> : null}
                          <Badge variant="outline">Internal</Badge>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{note.note}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {note.can_edit ? (
                          <Button variant="ghost" size="icon" aria-label="Edit note" onClick={() => setEditingNote(note)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {note.can_archive ? (
                          <Button variant="ghost" size="icon" aria-label="Archive note" onClick={() => setArchiveTarget(note)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {note.author_email} · Created {formatOverviewTimestamp(note.created_at)}
                      {note.updated_at !== note.created_at ? ` · Updated ${formatOverviewTimestamp(note.updated_at)}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={editingNote !== null} onOpenChange={(open) => !open && setEditingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit support note</AlertDialogTitle>
            <AlertDialogDescription>
              Updates are audited as SUPPORT_NOTE_UPDATED. Archived notes cannot be edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {editingNote ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateMutation.mutate({
                  noteId: editingNote.id,
                  note: editingNote.note,
                  category: editingNote.category,
                });
              }}
            >
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingNote.category}
                  onValueChange={(value) =>
                    setEditingNote((previous) =>
                      previous ? { ...previous, category: value as SupportNoteCategory } : previous,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.key} value={category.key}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-support-note">Note</Label>
                <Textarea
                  id="edit-support-note"
                  value={editingNote.note}
                  onChange={(event) =>
                    setEditingNote((previous) => (previous ? { ...previous, note: event.target.value } : previous))
                  }
                  rows={5}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <Button type="submit" disabled={updateMutation.isPending || !editingNote.note.trim()}>
                  Save changes
                </Button>
              </AlertDialogFooter>
            </form>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive support note?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived notes remain in the audit trail but are hidden from the default timeline. Only OWNER can archive
              notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={archiveMutation.isPending || !archiveTarget}
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
            >
              Archive note
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
