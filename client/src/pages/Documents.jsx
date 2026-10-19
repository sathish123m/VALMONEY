import { useCallback, useRef, useState } from 'react';
import { Download, FileText, Pencil, Trash2, UploadCloud } from 'lucide-react';
import { api, API_BASE } from '../lib/api';
import { fileSize, shortDate, currency } from '../lib/format';
import { useAsync, useDocumentTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, IconButton } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { cn } from '../lib/cn';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export default function Documents() {
  useDocumentTitle('Documents');
  const { user } = useAuth();
  const toast = useToast();
  const currencyCode = user?.currency ?? 'USD';
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ vendor: '', total: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const documents = useAsync(() => api.get('/api/receipts?limit=50'));

  const upload = useCallback(
    async (files) => {
      const file = files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploading(true);
        const result = await api.upload('/api/receipts', formData);
        const extracted = result.receipt;
        toast.success(
          'Document uploaded',
          extracted.vendor
            ? `Detected ${extracted.vendor}${extracted.total !== null ? ` · ${currency(extracted.total, currencyCode)}` : ''}`
            : 'Stored. You can label it manually.',
        );
        documents.reload();
      } catch (error) {
        toast.error('Upload failed', error.message);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [currencyCode, documents, toast],
  );

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/receipts/${pendingDelete.id}`);
      toast.success('Document deleted');
      setPendingDelete(null);
      documents.reload();
    } catch (error) {
      toast.error('Could not delete that document', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const saveEdits = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await api.patch(`/api/receipts/${editing.id}`, {
        vendor: draft.vendor.trim() || null,
        total: draft.total === '' ? null : Number(draft.total),
        notes: draft.notes.trim() || null,
      });
      toast.success('Document updated');
      setEditing(null);
      documents.reload();
    } catch (error) {
      toast.error('Could not update that document', error.message);
    } finally {
      setSaving(false);
    }
  };

  /** The file endpoint needs the auth header, so fetch it and open a blob URL. */
  const openFile = async (document) => {
    try {
      const response = await fetch(`${API_BASE}${document.fileUrl}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('valmoney:token') ?? ''}` },
      });
      if (!response.ok) throw new Error('That file is no longer available.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error('Could not open that file', error.message);
    }
  };

  const list = documents.data?.receipts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Documents</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Keep statements and receipts alongside the plan. Vendor and total are read from the file name when it is
          descriptive enough — nothing is invented.
        </p>
      </div>

      <Card>
        <CardBody>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              upload(event.dataTransfer.files);
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
              dragging ? 'border-brand bg-brand/8' : 'border-line bg-surface-muted/40',
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-ink-muted shadow-soft">
              {uploading ? <Spinner size={20} /> : <UploadCloud size={22} />}
            </span>

            <p className="mt-4 text-sm font-semibold text-ink">
              {uploading ? 'Uploading…' : 'Drop a receipt or statement here'}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">JPEG, PNG, WEBP, HEIC or PDF · up to 10 MB</p>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => upload(event.target.files)}
            />

            <Button variant="secondary" className="mt-4" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Choose a file
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Stored documents"
          description={list.length ? `${list.length} file${list.length === 1 ? '' : 's'}` : undefined}
        />

        {documents.loading && !documents.data ? (
          <div className="grid place-items-center py-16">
            <Spinner size={22} />
          </div>
        ) : documents.error ? (
          <ErrorState className="m-5" error={documents.error} onRetry={documents.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing stored yet"
            description="Upload a statement or receipt and it will appear here with the details we can read from it."
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{document.originalName}</p>
                    <p className="text-xs text-ink-muted">
                      {fileSize(document.sizeBytes)} · {shortDate(document.createdAt)}
                      {document.vendor ? ` · ${document.vendor}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {document.total !== null ? (
                    <Badge tone="brand">{currency(document.total, currencyCode)}</Badge>
                  ) : (
                    <Badge tone="muted">No amount read</Badge>
                  )}

                  <IconButton label={`Open ${document.originalName}`} onClick={() => openFile(document)}>
                    <Download size={15} />
                  </IconButton>

                  <IconButton
                    label={`Edit details for ${document.originalName}`}
                    onClick={() => {
                      setEditing(document);
                      setDraft({
                        vendor: document.vendor ?? '',
                        total: document.total === null ? '' : String(document.total),
                        notes: document.notes ?? '',
                      });
                    }}
                  >
                    <Pencil size={15} />
                  </IconButton>

                  <IconButton
                    label={`Delete ${document.originalName}`}
                    onClick={() => setPendingDelete(document)}
                    className="hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Document details"
        description="Correct anything the automatic reader got wrong."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdits} loading={saving}>
              Save details
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Vendor">
            <Input value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} placeholder="Starbucks" />
          </Field>
          <Field label="Total">
            <Input
              type="number"
              step="0.01"
              value={draft.total}
              onChange={(event) => setDraft({ ...draft, total: event.target.value })}
              placeholder="12.50"
            />
          </Field>
          <Field label="Notes">
            <Input value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Reimbursable" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this document?"
        description={`"${pendingDelete?.originalName ?? ''}" and its stored file will be permanently removed.`}
        confirmLabel="Delete document"
      />
    </div>
  );
}
