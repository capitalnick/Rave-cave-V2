import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  Input,
  Heading,
  MonoLabel,
  Body,
  Divider,
  InlineMessage,
  Card,
} from '@/components/rc';
import WineIcon from '@/components/icons/WineIcon';

type Step = 'credentials' | 'display-name';

export default function LoginPage() {
  const { error, signInWithGoogle, continueWithEmail, signUpWithEmail } = useAuth();

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const needsSignup = step === 'display-name';
  const disabled = submitting || !email || !password || (needsSignup && !displayName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (needsSignup) {
        await signUpWithEmail(email, password, displayName);
      } else {
        const result = await continueWithEmail(email, password);
        if (result === 'needs-signup') setStep('display-name');
      }
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

  const handleBack = () => {
    setStep('credentials');
    setDisplayName('');
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
              {needsSignup
                ? "Looks like you're new! Choose a display name."
                : 'Your personal wine cellar'}
            </MonoLabel>
          </div>

          {/* Google sign-in */}
          {!needsSignup && (
            <>
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
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
            <AnimatePresence initial={false}>
              {needsSignup && (
                <motion.div
                  key="displayName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <Input
                    typeVariant="Text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    state={submitting ? 'Disabled' : 'Default'}
                    autoComplete="name"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              typeVariant="Text"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              state={needsSignup || submitting ? 'Disabled' : 'Default'}
              autoComplete="email"
            />

            <Input
              typeVariant="Text"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              state={needsSignup || submitting ? 'Disabled' : 'Default'}
              autoComplete={needsSignup ? 'new-password' : 'current-password'}
            />

            <Button
              type="submit"
              variantType="Primary"
              label={
                submitting
                  ? needsSignup ? 'Creating Account...' : 'Signing In...'
                  : needsSignup ? 'Create Account' : 'Continue with Email'
              }
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

          {/* Back link (only in display-name step) */}
          {needsSignup && (
            <Button
              variantType="Tertiary"
              label="Back"
              onClick={handleBack}
            />
          )}

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
