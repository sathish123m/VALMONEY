import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { AuthLayout, FormAlert } from './AuthLayout';

const DEMO = { email: 'demo@valmoney.app', password: 'Demo1234' };

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Where to land after signing in — set by the route guard, or the dashboard.
  const destination = location.state?.from ?? '/dashboard';

  const signIn = async (credentials, { quiet = false } = {}) => {
    setSubmitting(true);
    setErrors({});

    try {
      const { user } = await login(credentials);
      if (!quiet) toast.success(`Welcome back, ${user.username.split(' ')[0]}`);
      navigate(destination, { replace: true });
    } catch (error) {
      const fieldErrors = error.fieldErrors ?? {};
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error.message });
      if (Object.keys(fieldErrors).length) toast.error('Check the form', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Pick up your plan where you left it."
      footer={
        <>
          New to VALMONEY?{' '}
          <Link to="/register" className="font-semibold text-brand transition-colors hover:text-brand-strong">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => { event.preventDefault(); signIn(form); }} className="space-y-4" noValidate>
        <FormAlert>{errors.form}</FormAlert>

        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
          />
        </Field>

        <Field label="Password" required error={errors.password}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
          />
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand transition-colors hover:text-brand-strong">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign in <ArrowRight size={16} />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="secondary"
        className="w-full"
        disabled={submitting}
        onClick={() => signIn(DEMO, { quiet: true })}
      >
        <Sparkles size={16} className="text-brand" /> Explore the demo account
      </Button>
    </AuthLayout>
  );
}
