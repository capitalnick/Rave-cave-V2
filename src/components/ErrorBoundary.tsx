import React from 'react';
import * as Sentry from '@sentry/react';
import { Card, Heading, Body, Button } from '@/components/rc';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info);
    }
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--rc-surface-primary)] px-4">
        <Card elevation="raised" padding="standard" className="max-w-[440px] w-full text-center">
          <Heading scale="heading" colour="accent-coral">Something went wrong</Heading>
          <div className="h-3" />
          <Body colour="secondary" className="w-auto">
            An unexpected error occurred. The team has been notified.
          </Body>
          <div className="h-6" />
          <Button variantType="Primary" label="Back to Home" onClick={this.handleReset} className="w-full" />
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary;
