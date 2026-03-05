import { useState, type FormEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  Input,
  Heading,
  MonoLabel,
  Divider,
  InlineMessage,
  Card,
} from '@/components/rc';
import WineIcon from '@/components/icons/WineIcon';

export default function LoginPage() {
  const { error, signInWithGoogle, continueWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const disabled = submitting || !email || !password;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await continueWithEmail(email, password, displayName || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--rc-surface-primary)] px-4">
      <Card elevation="raised" padding="standard" className="w-full max-w-[440px]">
        <div className="flex flex-col items-center gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2">
            <WineIcon size={48} />
            <Heading scale="title" colour="accent-pink" align="centre">
              RAVE CAVE
            </Heading>
            <MonoLabel size="label" colour="ghost" className="w-auto">
              Your personal wine cellar
            </MonoLabel>
          </div>

          {/* Google sign-in */}
          <Button
            variantType="Primary"
            label={submitting ? 'Connecting...' : 'Continue with Google'}
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="w-full"
          />

          {/* Divider row */}
          <div className="flex items-center gap-3 w-full">
            <Divider className="flex-1" />
            <MonoLabel size="label" colour="ghost" className="w-auto">
              or
            </MonoLabel>
            <Divider className="flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
            <Input
              typeVariant="Text"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              state={submitting ? 'Disabled' : 'Default'}
              autoComplete="email"
            />

            <Input
              typeVariant="Text"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              state={submitting ? 'Disabled' : 'Default'}
              autoComplete="current-password"
            />

            <Input
              typeVariant="Text"
              placeholder="Display name (new accounts)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              state={submitting ? 'Disabled' : 'Default'}
              autoComplete="name"
            />

            <Button
              type="submit"
              variantType="Primary"
              label={submitting ? 'Signing In...' : 'Continue with Email'}
              disabled={disabled}
              className="w-full"
            />
          </form>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <InlineMessage tone="error" message={error} />
            )}
          </AnimatePresence>

          {/* Learn more */}
          <a
            href="/welcome"
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)] transition-colors"
          >
            Learn more about Rave Cave &rarr;
          </a>
        </div>
      </Card>
    </div>
  );
}
