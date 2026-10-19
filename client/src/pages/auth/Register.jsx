import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { AuthLayout, FormAlert } from './AuthLayout';

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), label: 'One letter and one number' },
];

const PERKS = ['Free, no credit checks', 'Add or delete accounts any time', 'Export your ledger to CSV'];

export default function Register() {
  useDocumentTitle('Create your account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});

    const clientErrors = {};
    if (form.username.trim().length < 2) clientErrors.username = 'Tell us what to call you.';
    if (!PASSWORD_RULES.every((rule) => rule.test(form.password))) clientErrors.password = 'Password is not strong enough yet.';
    if (form.password !== form.confirm) clientErrors.confirm = 'Passwords do not match.';

    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);

    try {
      const { user } = await register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      toast.success(`Welcome aboard, ${user.username.split(' ')[0]}`, 'Your workspace is ready — add your first account.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const fieldErrors = error.fieldErrors ?? {};
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error.message });
      if (!Object.keys(fieldErrors).length) toast.error('Could not create your account', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Two fields and a password. You can add your first account straight after."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand transition-colors hover:text-brand-strong">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{errors.form}</FormAlert>

        <Field label="Full name" required error={errors.username}>
          <Input
            autoComplete="name"
            autoFocus
            placeholder="Sathish M."
            value={form.username}
            onChange={(event) => update({ username: event.target.value })}
            error={errors.username}
          />
        </Field>

        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
            error={errors.email}
          />
        </Field>

        <Field label="Password" required error={errors.password}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => update({ password: event.target.value })}
            error={errors.password}
          />
        </Field>

        <div className="space-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(form.password);
            return (
              <p
                key={rule.label}
                className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                  passed ? 'text-success' : 'text-ink-subtle'
                }`}
              >
                <Check size={13} className={passed ? 'opacity-100' : 'opacity-40'} />
                {rule.label}
              </p>
            );
          })}
        </div>

        <Field label="Confirm password" required error={errors.confirm}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={(event) => update({ confirm: event.target.value })}
            error={errors.confirm}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create my account <ArrowRight size={16} />
        </Button>

        <ul className="space-y-1.5 pt-1">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-xs text-ink-subtle">
              <Check size={13} className="text-success" />
              {perk}
            </li>
          ))}
        </ul>
      </form>
    </AuthLayout>
  );
}
