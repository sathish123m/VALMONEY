import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { DEBT_TYPES } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  name: '',
  type: 'CREDIT_CARD',
  balance: '',
  apr: '',
  minPayment: '',
  creditLimit: '',
  dueDay: '',
  notes: '',
};

/** Validates client-side so obvious mistakes never reach the API. */
function validate(form) {
  const errors = {};

  if (!form.name.trim()) errors.name = 'Give this account a name.';

  const balance = Number(form.balance);
  if (!Number.isFinite(balance) || balance <= 0) errors.balance = 'Enter the amount you still owe.';

  const apr = Number(form.apr);
  if (!Number.isFinite(apr) || apr < 0) errors.apr = 'Enter an interest rate (0 for interest-free).';
  if (Number.isFinite(apr) && apr > 100) errors.apr = 'That rate looks too high.';

  const min = Number(form.minPayment);
  if (!Number.isFinite(min) || min <= 0) errors.minPayment = 'Enter the minimum monthly payment.';

  if (form.creditLimit !== '' && Number(form.creditLimit) <= 0) errors.creditLimit = 'Credit limit must be positive.';
  if (form.dueDay !== '' && (Number(form.dueDay) < 1 || Number(form.dueDay) > 31)) errors.dueDay = 'Use a day between 1 and 31.';

  // A minimum payment below the first month's interest never reduces the balance.
  if (Number.isFinite(balance) && Number.isFinite(min) && Number.isFinite(apr) && min > 0) {
    const monthlyInterest = (balance * (apr / 100)) / 12;
    if (min <= monthlyInterest && balance > 0) {
      errors.minPayment = `This is below the ${monthlyInterest.toFixed(2)} monthly interest, so the balance would grow.`;
    }
  }

  return errors;
}

export function AccountFormModal({ open, onClose, account, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(account?.id);

  // Load the record being edited, or reset for a new one.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      account
        ? {
            name: account.name ?? '',
            type: account.type ?? 'OTHER',
            balance: String(account.balance ?? ''),
            apr: String(account.apr ?? ''),
            minPayment: String(account.minPayment ?? ''),
            creditLimit: account.creditLimit === null || account.creditLimit === undefined ? '' : String(account.creditLimit),
            dueDay: account.dueDay ? String(account.dueDay) : '',
            notes: account.notes ?? '',
          }
        : EMPTY,
    );
  }, [open, account]);

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const found = validate(form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      balance: Number(form.balance),
      apr: Number(form.apr),
      minPayment: Number(form.minPayment),
      dueDay: form.dueDay === '' ? null : Number(form.dueDay),
      notes: form.notes.trim() || null,
      ...(form.creditLimit === '' ? {} : { creditLimit: Number(form.creditLimit) }),
    };

    try {
      setSaving(true);
      const result = isEdit
        ? await api.patch(`/api/debts/${account.id}`, payload)
        : await api.post('/api/debts', payload);

      toast.success(isEdit ? 'Account updated' : 'Account added', `${payload.name} is now part of your plan.`);
      onSaved?.(result.debt);
      onClose();
    } catch (error) {
      if (error.details?.length) {
        setErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      }
      toast.error('Could not save that account', error.message);
    } finally {
      setSaving(false);
    }
  };

  const revolving = form.type === 'CREDIT_CARD';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit account' : 'Add an account'}
      description="Balances, rates and minimums drive the whole payoff projection, so accuracy here matters."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="account-form" type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Add account'}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} className="space-y-4">
        <Field label="Account name" required error={errors.name}>
          <Input
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            placeholder="Visa Platinum"
            autoFocus
            maxLength={80}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" error={errors.type}>
            <Select value={form.type} onChange={set('type')}>
              {DEBT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Current balance" required error={errors.balance}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix="$"
              value={form.balance}
              onChange={set('balance')}
              error={errors.balance}
              placeholder="4823.00"
            />
          </Field>

          <Field label="Interest rate (APR %)" required error={errors.apr}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              suffix="%"
              value={form.apr}
              onChange={set('apr')}
              error={errors.apr}
              placeholder="23.99"
            />
          </Field>

          <Field label="Minimum payment" required error={errors.minPayment}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix="$"
              value={form.minPayment}
              onChange={set('minPayment')}
              error={errors.minPayment}
              placeholder="125.00"
            />
          </Field>

          <Field
            label="Credit limit"
            hint={revolving ? 'Used to calculate utilisation.' : 'Optional.'}
            error={errors.creditLimit}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix="$"
              value={form.creditLimit}
              onChange={set('creditLimit')}
              error={errors.creditLimit}
              placeholder="8000"
            />
          </Field>

          <Field label="Payment due day" hint="Day of the month." error={errors.dueDay}>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={set('dueDay')}
              error={errors.dueDay}
              placeholder="14"
            />
          </Field>
        </div>

        <Field label="Notes" hint="Optional — anything you want to remember.">
          <Textarea value={form.notes} onChange={set('notes')} maxLength={500} placeholder="Balance transfer ends in March…" />
        </Field>
      </form>
    </Modal>
  );
}

/** Row of headline numbers for a single account. */
export function AccountSummaryStrip({ account, className }) {
  const items = [
    { label: 'Balance', value: `$${Number(account.balance).toLocaleString()}` },
    { label: 'APR', value: `${Number(account.apr).toFixed(2)}%` },
    { label: 'Minimum', value: `$${Number(account.minPayment).toLocaleString()}` },
  ];

  return (
    <dl className={cn('grid grid-cols-3 gap-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-surface-muted p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
