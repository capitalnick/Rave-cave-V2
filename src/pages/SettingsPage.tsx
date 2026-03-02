import React from 'react';
import { PageHeader, Card, Row, Heading } from '@/components/rc';
import AccountSection from '@/components/settings/AccountSection';
import PlanSection from '@/components/settings/PlanSection';
import PreferencesSection from '@/components/settings/PreferencesSection';
import DangerZoneSection from '@/components/settings/DangerZoneSection';

// ── Constants ──

const PRIVACY_URL = 'https://ravecave.app/privacy';
const TERMS_URL = 'https://ravecave.app/terms';

// ── Settings Page ──

const SettingsPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-10 h-full overflow-y-auto">
      <PageHeader title="SETTINGS" subtitle="Account & preferences" />
      <div className="h-8" />

      <AccountSection />
      <div className="h-8" />

      <PlanSection />
      <div className="h-8" />

      <PreferencesSection />
      <div className="h-8" />

      {/* ── About Section ── */}
      <Heading scale="subhead" className="mb-2">About</Heading>
      <Card elevation="flat">
        <Row title="Version" trailingAction="value" trailingValue="1.0.0" divider={true} />
        <Row
          title="Privacy Policy"
          trailingAction="chevron"
          onClick={() => window.open(PRIVACY_URL, '_blank')}
          divider={true}
        />
        <Row
          title="Terms of Service"
          trailingAction="chevron"
          onClick={() => window.open(TERMS_URL, '_blank')}
          divider={false}
        />
      </Card>
      <div className="h-8" />

      <DangerZoneSection />
      <div className="h-20" />
    </div>
  );
};

export default SettingsPage;
