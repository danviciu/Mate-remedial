import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Eroare necunoscută.",
    };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary:", error);
    }
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-2xl font-black">Ecran indisponibil temporar</h2>
        <p className="mt-2 text-base">
          A apărut o eroare în această pagină. Restul aplicației rămâne funcțional.
        </p>
        <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm">
          Detaliu: {this.state.message}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }
}
