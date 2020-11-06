import * as React from "react";
const s = require("./errorBoundary.scss");

interface Props {}

interface State {
  haveError: boolean;
  showError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    haveError: false,
    showError: false,
  };

  public componentDidCatch(error: Error): void {
    this.setState({ error, haveError: true });
  }

  private reloadPage = () => {
    window.location.reload(true);
  };

  private clearSiteData = () => {
    window.localStorage.clear();
    window.location.reload(true);
  };

  private toogleErrorDisplay() {
    this.setState({ ...this.state, showError: !this.state.showError });
  }

  public render(): React.ReactNode {
    const { haveError, error, showError } = this.state;

    if (haveError) {
      return (
        <div className={s.appError}>
          <div className={s.message}>
            <div className={s.title}>Oh no!</div>
            <div className={s.subtitle}>A nossa equipe já foi notificada do erro. Por favor, recarregue a página e tente novamente.</div>
          </div>
          <div className={s.actions}>
            <div onClick={this.toogleErrorDisplay} role="button">
              {showError ? "Menos detalhes" : "Mais detalhes"}
            </div>
            <div onClick={this.reloadPage} role="button">
              Recarregar
            </div>
            <div onClick={this.clearSiteData} role="button">
              Limpar dados locais
            </div>
          </div>
          {showError && error ? (
            <div className={s.errorDisplay}>
              <div className={s.errorName}>{error.name}</div>
              <div className={s.errorMessage}>{error.message}</div>
              <pre className={s.errorStack}>{error.stack}</pre>
            </div>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
