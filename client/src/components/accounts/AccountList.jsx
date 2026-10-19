import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { debtTypeLabel, debtTypeTone } from '../../lib/constants';
import { cn } from '../../lib/cn';

const money = (value) => `$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

/** Desktop table. Hidden below `lg` in favour of the card list. */
export function AccountTable({ accounts, onEdit, onDelete, className }) {
  if (!accounts.length) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No accounts yet"
        description="Add your first balance and VALMONEY will build a dated payoff plan around it."
        action={<Button onClick={onEdit}>Add an account</Button>}
      />
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-5 py-3 font-semibold">Account</th>
            <th className="px-5 py-3 text-right font-semibold">Balance</th>
            <th className="px-5 py-3 text-right font-semibold">APR</th>
            <th className="px-5 py-3 text-right font-semibold">Minimum</th>
            <th className="px-5 py-3 text-right font-semibold">Limit</th>
            <th className="px-5 py-3 text-right font-semibold">Due</th>
            <th className="px-5 py-3 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/60">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted">
                    <CreditCard size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{account.name}</p>
                    <Badge tone={debtTypeTone(account.type)} className="mt-1">
                      {debtTypeLabel(account.type)}
                    </Badge>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-right font-semibold tabular-nums text-ink">{money(account.balance)}</td>
              <td className="px-5 py-4 text-right tabular-nums">
                <span className={account.apr >= 20 ? 'font-semibold text-danger' : 'text-ink-muted'}>
                  {Number(account.apr).toFixed(2)}%
                </span>
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-ink-muted">{money(account.minPayment)}</td>
              <td className="px-5 py-4 text-right tabular-nums text-ink-muted">
                {account.creditLimit ? money(account.creditLimit) : '—'}
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-ink-muted">
                {account.dueDay ? `Day ${account.dueDay}` : '—'}
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1">
                  <IconButton label={`Edit ${account.name}`} onClick={() => onEdit(account)}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${account.name}`}
                    onClick={() => onDelete(account)}
                    className="hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card list used on phones and tablets. */
export function AccountCards({ accounts, onEdit, onDelete, className }) {
  if (!accounts.length) return null;

  return (
    <ul className={cn('divide-y divide-line lg:hidden', className)}>
      {accounts.map((account) => (
        <li key={account.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{account.name}</p>
              <Badge tone={debtTypeTone(account.type)} className="mt-1.5">
                {debtTypeLabel(account.type)}
              </Badge>
            </div>
            <div className="flex shrink-0 gap-1">
              <IconButton label={`Edit ${account.name}`} onClick={() => onEdit(account)}>
                <Pencil size={15} />
              </IconButton>
              <IconButton
                label={`Delete ${account.name}`}
                onClick={() => onDelete(account)}
                className="hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 xs:grid-cols-4">
            {[
              { label: 'Balance', value: money(account.balance) },
              { label: 'APR', value: `${Number(account.apr).toFixed(2)}%` },
              { label: 'Minimum', value: money(account.minPayment) },
              { label: 'Due', value: account.dueDay ? `Day ${account.dueDay}` : '—' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{item.label}</dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
