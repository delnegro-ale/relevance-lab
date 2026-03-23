import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-danger">
                  {this.props.fallbackTitle || 'Erro ao renderizar esta seção'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Um erro inesperado impediu a exibição deste componente. Isso pode acontecer com dados de execuções anteriores que estão incompletos ou corrompidos.
                </p>
                {this.state.error && (
                  <pre className="text-[10px] font-mono-data text-muted-foreground/70 mt-2 bg-muted/30 p-2 rounded overflow-auto max-h-24">
                    {this.state.error.message}
                  </pre>
                )}
                <Button variant="outline" size="sm" onClick={this.handleRetry} className="mt-3">
                  <RotateCcw className="h-3 w-3 mr-1.5" /> Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
