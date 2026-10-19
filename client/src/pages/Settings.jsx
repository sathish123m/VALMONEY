import { useState } from 'react';
import { Bell, KeyRound, Mail, ShieldAlert, User } from 'lucide-react';
import { api } from '../lib/api';
import { CURRENCIES } from '../lib/constants';
import { currency } from '../lib/format';
import { useDocumentTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input, Select } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/Modal';

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, setUser, signOut } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({
    username: user?.username ?? '',
    mobile: user?.mobile ?? '',
    currency: user?.currency ?? 'USD',
    extraMonthlyPayment: String(user?.extraMonthlyPayment ?? 0),
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSavingProfile(true);
      setProfileErrors({});
      const { user: updated } = await api.patch('/api/user/me', {
        username: profile.username.trim(),
        mobile: profile.mobile.trim() || null,
        currency: profile.currency,
        extraMonthlyPayment: Number(profile.extraMonthlyPayment) || 0,
      });
      setUser(updated);
      toast.success('Settings saved');
    } catch (error) {
      if (error.details?.length) setProfileErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      toast.error('Could not save your settings', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (passwords.newPassword !== passwords.confirm) {
      setPasswordErrors({ confirm: 'Passwords do not match.' });
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordErrors({});
      await api.post('/api/user/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated');
    } catch (error) {
      if (error.details?.length) setPasswordErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      else setPasswordErrors({ currentPassword: error.message });
      toast.error('Could not change your password', error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const requestCode = async () => {
    try {
      setSendingOtp(true);
      const result = await api.post('/api/user/verify-email');
      toast.success('Verification code sent', result.message);
    } catch (error) {
      toast.error('Could not send a code', error.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const confirmCode = async (event) => {
    event.preventDefault();
    try {
      setVerifyingOtp(true);
      const { user: updated } = await api.put('/api/user/verify-email', { code: otp });
      setUser(updated);
      setOtp('');
      toast.success('Email verified');
    } catch (error) {
      toast.error('Verification failed', error.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete('/api/user/me', { password: deletePassword });
      toast.success('Account deleted');
      signOut();
    } catch (error) {
      toast.error('Could not delete your account', error.message);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Settings</h2>
        <p className="mt-1 text-sm text-ink-muted">Your details, security and the defaults the planner uses.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={User} title="Profile" description="Shown across the app and used for currency formatting." />
          <CardBody>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={profileErrors.username}>
                  <Input
                    value={profile.username}
                    onChange={(event) => setProfile({ ...profile, username: event.target.value })}
                    error={profileErrors.username}
                  />
                </Field>

                <Field label="Phone" hint="Optional." error={profileErrors.mobile}>
                  <Input
                    value={profile.mobile}
                    onChange={(event) => setProfile({ ...profile, mobile: event.target.value })}
                    placeholder="+1 555 000 0000"
                    error={profileErrors.mobile}
                  />
                </Field>

                <Field label="Currency">
                  <Select value={profile.currency} onChange={(event) => setProfile({ ...profile, currency: event.target.value })}>
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Extra monthly payment"
                  hint={`Currently ${currency(Number(profile.extraMonthlyPayment) || 0, profile.currency, { decimals: 0 })} — the accelerator on your plan.`}
                >
                  <Input
                    type="number"
                    min="0"
                    step="25"
                    prefix="$"
                    value={profile.extraMonthlyPayment}
                    onChange={(event) => setProfile({ ...profile, extraMonthlyPayment: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Email">
                <Input value={user?.email ?? ''} disabled />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={Mail}
            title="Email verification"
            description="Confirms you own this address."
            action={user?.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Pending</Badge>}
          />
          <CardBody className="space-y-4">
            {user?.emailVerified ? (
              <p className="text-sm text-ink-muted">
                Your address is verified. This lets you reset a forgotten password by email.
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-muted">
                  We will email a six-digit code. In local development the code is printed to the API console instead.
                </p>

                <Button variant="secondary" className="w-full" onClick={requestCode} loading={sendingOtp}>
                  Send code
                </Button>

                <form onSubmit={confirmCode} className="space-y-3">
                  <Field label="Verification code">
                    <Input
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      placeholder="123456"
                      className="text-center text-lg tracking-[0.4em]"
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={otp.length !== 6} loading={verifyingOtp}>
                    Verify email
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={KeyRound} title="Password" description="Use at least eight characters with a letter and a number." />
          <CardBody>
            <form onSubmit={changePassword} className="space-y-4">
              <Field label="Current password" required error={passwordErrors.currentPassword}>
                <Input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                  error={passwordErrors.currentPassword}
                  autoComplete="current-password"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" required error={passwordErrors.newPassword}>
                  <Input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                    error={passwordErrors.newPassword}
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirm new password" required error={passwordErrors.confirm}>
                  <Input
                    type="password"
                    value={passwords.confirm}
                    onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                    error={passwordErrors.confirm}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="secondary" loading={savingPassword}>
                  Update password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Bell} title="Planner defaults" description="What the engine assumes before it knows better." />
          <CardBody className="space-y-3 text-sm text-ink-muted">
            <p>
              The projection assumes your monthly outlay is the sum of every minimum payment plus your extra amount, and
              that it stays committed until the last account closes.
            </p>
            <p>
              Minimums freed up when an account is paid off are rolled onto the next target automatically — that is the
              snowball effect, and it is why the plan beats paying minimums alone.
            </p>
          </CardBody>
        </Card>

        <Card className="border-danger/30 lg:col-span-2">
          <CardHeader
            icon={ShieldAlert}
            title="Delete account"
            description="Removes your profile, accounts, transactions and documents."
          />
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-lg text-sm text-ink-muted">
              This is immediate and cannot be undone. Export your ledger first if you want a copy.
            </p>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete my account
            </Button>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
        loading={deleting}
        title="Delete your VALMONEY account?"
        description="Enter your password to confirm. Everything is removed permanently."
        confirmLabel="Delete everything"
      >
        <div className="p-1">
          <Field label="Password" required>
            <Input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}
