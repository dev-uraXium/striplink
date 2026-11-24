import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2, Vote, X } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPage from '../../components/admin/AdminPage';
import AdminRefreshButton from '../../components/admin/AdminRefreshButton';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminToggleSwitch from '../../components/admin/AdminToggleSwitch';
import {
  AdminCardListSkeleton,
  AdminEmptyState,
  AdminErrorState,
} from '../../components/admin/AdminStates';
import { useAdminConfirm } from '../../components/admin/useAdminConfirm';
import { PopupCard } from '../../components/BottomPopup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  createAdminPopup,
  deleteAdminPopup,
  fetchAdminPopups,
  setAdminPopupActive,
  updateAdminPopup,
  type AdminPopup,
  type PopupInput,
} from '../../utils/fetch/popups';

const EMPTY: PopupInput = {
  kind: 'notice',
  title: '',
  body: '',
  buttonLabel: '',
  buttonUrl: '',
  options: ['', ''],
  audience: 'everyone',
  endsAt: null,
};

// datetime-local <-> ISO
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border p-0.5">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm',
            value === it.value
              ? 'bg-blue-600 text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function PopupEditor({
  initial,
  editingId,
  onDone,
}: {
  initial: PopupInput;
  editingId: number | null;
  onDone: () => void;
}) {
  const [f, setF] = useState<PopupInput>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PopupInput>(k: K, v: PopupInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const clean = (): PopupInput => ({
    ...f,
    buttonLabel: f.buttonUrl ? f.buttonLabel || null : null,
    buttonUrl: f.buttonUrl || null,
    options:
      f.kind === 'poll' ? f.options.map((o) => o.trim()).filter(Boolean) : [],
  });

  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      if (editingId) await updateAdminPopup(editingId, clean());
      else await createAdminPopup(clean(), publish);
      toast.success(
        editingId ? 'Popup saved' : publish ? 'Popup is live' : 'Draft saved'
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const preview = {
    ...clean(),
    id: 0,
    active: true,
    createdAt: '',
    title: f.title || 'Your title',
    options:
      f.kind === 'poll'
        ? f.options.map((o, i) => o.trim() || `Answer ${i + 1}`)
        : [],
  };

  return (
    <div className="grid gap-6 rounded-2xl border p-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={f.kind}
            onChange={(v) => set('kind', v)}
            items={[
              { value: 'notice', label: 'Notice' },
              { value: 'poll', label: 'Poll' },
            ]}
          />
          <Segmented
            value={f.audience}
            onChange={(v) => set('audience', v)}
            items={[
              { value: 'everyone', label: 'Everyone' },
              { value: 'signed_in', label: 'Signed-in only' },
            ]}
          />
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            {f.kind === 'poll' ? 'Question' : 'Title'}
          </span>
          <Input
            value={f.title}
            maxLength={120}
            onChange={(e) => set('title', e.target.value)}
            placeholder={
              f.kind === 'poll'
                ? 'Which airport should get charts next?'
                : 'New: PF Radar is live'
            }
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Text (optional)</span>
          <Textarea
            value={f.body}
            maxLength={1000}
            rows={3}
            onChange={(e) => set('body', e.target.value)}
          />
        </label>

        {f.kind === 'poll' && (
          <div className="space-y-2 text-sm">
            <span className="font-medium">Answers (2-6)</span>
            {f.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={o}
                  maxLength={80}
                  placeholder={`Answer ${i + 1}`}
                  onChange={(e) =>
                    set(
                      'options',
                      f.options.map((x, j) => (j === i ? e.target.value : x))
                    )
                  }
                />
                {f.options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove answer"
                    onClick={() =>
                      set(
                        'options',
                        f.options.filter((_, j) => j !== i)
                      )
                    }
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            {f.options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('options', [...f.options, ''])}
              >
                <Plus /> Add answer
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Button link (optional)</span>
            <Input
              value={f.buttonUrl ?? ''}
              placeholder="https://forms.gle/…"
              onChange={(e) => set('buttonUrl', e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Button text</span>
            <Input
              value={f.buttonLabel ?? ''}
              maxLength={40}
              placeholder="Take the survey"
              disabled={!f.buttonUrl}
              onChange={(e) => set('buttonLabel', e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Ends (optional)</span>
          <Input
            type="datetime-local"
            value={toLocal(f.endsAt)}
            onChange={(e) =>
              set(
                'endsAt',
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {editingId ? (
            <Button disabled={saving} onClick={() => void save(false)}>
              Save changes
            </Button>
          ) : (
            <>
              <Button disabled={saving} onClick={() => void save(true)}>
                Publish now
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => void save(false)}
              >
                Save as draft
              </Button>
            </>
          )}
          <Button variant="ghost" disabled={saving} onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Preview</p>
        <div className="flex min-h-48 items-end justify-center rounded-xl border border-dashed bg-zinc-950 p-4">
          <PopupCard key={JSON.stringify(preview)} popup={preview} preview />
        </div>
        <p className="text-xs text-muted-foreground">
          Shows at the bottom of every page, one popup at a time (the newest
          live one). Visitors can close it, and it won&apos;t come back for
          them. Polls take one vote per account, or per IP when signed out.
        </p>
      </div>
    </div>
  );
}

export default function AdminPopups() {
  const { confirm, confirmDialog } = useAdminConfirm();
  const [popups, setPopups] = useState<AdminPopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    id: number | null;
    initial: PopupInput;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPopups(await fetchAdminPopups());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (p: AdminPopup) => {
    try {
      await setAdminPopupActive(p.id, !p.active);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const remove = async (p: AdminPopup) => {
    const ok = await confirm({
      title: 'Delete popup?',
      description: `"${p.title}" and its votes will be deleted.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAdminPopup(p.id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  // popups come newest first; signed-in visitors see the newest live one,
  // signed-out visitors the newest live one meant for everyone
  const isLive = (p: AdminPopup) =>
    p.active && (!p.endsAt || new Date(p.endsAt) > new Date());
  const liveSignedIn = popups.find(isLive);
  const liveEveryone = popups.find(
    (p) => isLive(p) && p.audience === 'everyone'
  );

  return (
    <AdminLayout>
      <AdminPage
        title="Popups"
        description="Publish a notice or a quick poll at the bottom of the site."
        icon={Megaphone}
        actions={
          <div className="flex gap-2">
            <AdminRefreshButton onClick={() => void load()} loading={false} />
            {!editor && (
              <Button onClick={() => setEditor({ id: null, initial: EMPTY })}>
                <Plus /> New popup
              </Button>
            )}
          </div>
        }
      >
        {editor && (
          <PopupEditor
            key={editor.id ?? 'new'}
            initial={editor.initial}
            editingId={editor.id}
            onDone={() => {
              setEditor(null);
              void load();
            }}
          />
        )}

        {loading ? (
          <AdminCardListSkeleton count={3} />
        ) : error ? (
          <AdminErrorState
            title="Error loading popups"
            message={error}
            onRetry={() => void load()}
          />
        ) : popups.length === 0 ? (
          <AdminEmptyState icon={Megaphone} title="No popups yet." />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border">
            {popups.map((p) => {
              const total = p.votes.reduce((a, b) => a + b, 0);
              const ended = !!p.endsAt && new Date(p.endsAt) <= new Date();
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {p.kind === 'poll' ? (
                        <Vote className="size-5 shrink-0 text-blue-400" />
                      ) : (
                        <Megaphone className="size-5 shrink-0 text-blue-400" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {p.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.kind === 'poll' ? 'Poll' : 'Notice'} ·{' '}
                          {p.audience === 'everyone'
                            ? 'Everyone'
                            : 'Signed-in only'}
                          {p.endsAt &&
                            ` · ${ended ? 'ended' : 'ends'} ${new Date(p.endsAt).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {liveSignedIn?.id === p.id &&
                      (p.audience === 'signed_in' ||
                        liveEveryone?.id === p.id) ? (
                        <AdminStatusBadge tone="success" showLabel>
                          {p.audience === 'signed_in'
                            ? 'Live for signed-in'
                            : 'Live'}
                        </AdminStatusBadge>
                      ) : liveEveryone?.id === p.id ? (
                        <AdminStatusBadge tone="success" showLabel>
                          Live for signed-out
                        </AdminStatusBadge>
                      ) : p.active && !ended ? (
                        <AdminStatusBadge tone="warning" showLabel>
                          Queued (newer popup is live)
                        </AdminStatusBadge>
                      ) : null}
                      <AdminToggleSwitch
                        checked={p.active}
                        onChange={() => void toggle(p)}
                        aria-label={p.active ? 'Unpublish' : 'Publish'}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditor({
                            id: p.id,
                            initial: {
                              ...p,
                              buttonLabel: p.buttonLabel ?? '',
                              buttonUrl: p.buttonUrl ?? '',
                              options:
                                p.options.length >= 2 ? p.options : ['', ''],
                            },
                          })
                        }
                      >
                        <Pencil /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void remove(p)}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </div>
                  {p.kind === 'poll' && (
                    <div className="space-y-1 pl-8">
                      {p.options.map((o, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className="h-2 w-40 overflow-hidden rounded bg-muted">
                            <div
                              className="h-full bg-blue-500"
                              style={{
                                width: `${total ? (p.votes[i] / total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right tabular-nums">
                            {p.votes[i]}
                          </span>
                          <span className="truncate text-muted-foreground">
                            {o}
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        {total} {total === 1 ? 'vote' : 'votes'}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminPage>
      {confirmDialog}
    </AdminLayout>
  );
}
