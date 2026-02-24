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

type Mode = 'sign-in' | 'sign-up';

export default function LoginPage() {
  const { error, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';
  const disabled = submitting || !email || !password || (isSignUp && !displayName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
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

  const toggleMode = () => {
    setMode(m => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
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
            <AnimatePresence initial={false}>
              {isSignUp && (
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
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />

            <Button
              type="submit"
              variantType="Primary"
              label={
                submitting
                  ? isSignUp ? 'Creating Account...' : 'Signing In...'
                  : isSignUp ? 'Create Account' : 'Sign In'
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

          {/* Mode toggle */}
          <div className="flex items-center gap-1">
            <Body size="body" colour="secondary" className="w-auto">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Body>
            <Button
              variantType="Tertiary"
              label={isSignUp ? 'Sign in' : 'Sign up'}
              onClick={toggleMode}
            />
          </div>

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
