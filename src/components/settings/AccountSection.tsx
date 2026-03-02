import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  Row,
  Heading,
  Body,
  MonoLabel,
  Divider,
} from '@/components/rc';

const AccountSection: React.FC = () => {
  const { user, signOut } = useAuth();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const photoURL = user?.photoURL;
  const providerId = user?.providerData[0]?.providerId;
  const providerLabel =
    providerId === 'google.com' ? 'Connected via Google' :
    providerId === 'apple.com' ? 'Connected via Apple' :
    'Signed in with email';
  const initial = (displayName[0] || email[0] || 'U').toUpperCase();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <Heading scale="subhead" className="mb-2">Account</Heading>
      <Card elevation="flat">
        {/* Profile row */}
        <div className="flex items-center gap-4 py-[var(--rc-row-padding-v)] px-[var(--rc-row-padding-h)]">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-['Satoshi'] font-bold text-lg"
              style={{
                backgroundColor: 'var(--rc-accent-pink)',
                color: 'var(--rc-ink-on-accent)',
              }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <Body className="w-auto truncate">{displayName}</Body>
            <MonoLabel size="label" colour="ghost" className="w-auto truncate">{email}</MonoLabel>
            <MonoLabel size="label" colour="ghost" className="w-auto">{providerLabel}</MonoLabel>
          </div>
        </div>
        <Divider />
        <Row
          title="Sign Out"
          leadingIcon={<LogOut size={20} />}
          trailingAction="none"
          onClick={handleSignOut}
          divider={false}
        />
      </Card>
    </>
  );
};

export default AccountSection;
