import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { AuthLayout, FormAlert } from './AuthLayout';

export default function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/api/user/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (requestError) {
      setError(requestError.fieldErrors?.email ?? requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        description="If that address is registered, a six-digit reset code is on its way. It expires in 30 minutes."
      >
        <div className="card p-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success/12 text-success">
            <MailCheck size={20} />
          </span>
          <p className="mt-4 text-sm text-ink-muted">
            Nothing arrived after a few minutes? Check spam, or request another code — the newest one always wins.
          </p>

          <div className="mt-5 space-y-3">
            <Button as={Link} to={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`} className="w-full">
              <KeyRound size={16} /> Enter my reset code
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>

          <p className="mt-4 border-t border-line pt-4 text-xs text-ink-subtle">
            Local development note: the SMTP transport is replaced by a console log, so the code appears in the API output
            rather than in your inbox.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter the email on your account and we will send a six-digit code to reset it."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand transition-colors hover:text-brand-strong">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{error}</FormAlert>

        <Field label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}
