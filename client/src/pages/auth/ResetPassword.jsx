import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { AuthLayout, FormAlert } from './AuthLayout';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: params.get('email') ?? '',
    code: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/user/reset-password', {
        email: form.email.trim().toLowerCase(),
        code: form.code.trim(),
        newPassword: form.password,
      });
      toast.success('Password reset', 'Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      const fieldErrors = error.fieldErrors ?? {};
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      description="Paste the six-digit code from the reset email, then pick a password you have not used here before."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand transition-colors hover:text-brand-strong">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{errors.form}</FormAlert>

        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
            error={errors.email}
          />
        </Field>

        <Field label="Reset code" required error={errors.code} hint="Six digits, valid for 30 minutes.">
          <Input
            inputMode="numeric"
            placeholder="123456"
            className="text-center text-lg tracking-[0.4em]"
            value={form.code}
            onChange={(event) => update({ code: event.target.value.replace(/\D/g, '').slice(0, 6) })}
            error={errors.code}
          />
        </Field>

        <Field label="New password" required error={errors.password}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => update({ password: event.target.value })}
            error={errors.password}
          />
        </Field>

        <Field label="Confirm new password" required error={errors.confirm}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={(event) => update({ confirm: event.target.value })}
            error={errors.confirm}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={form.code.length !== 6}>
          Set my new password
        </Button>
      </form>
    </AuthLayout>
  );
}
