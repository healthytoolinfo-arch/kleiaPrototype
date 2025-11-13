
import React, { PropsWithChildren } from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }> = ({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) => {
  const base = "px-6 py-3 rounded-xl font-bold transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 text-center";
  const styles = {
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    ghost: "text-gray-600 hover:text-orange-600 hover:bg-orange-50 shadow-none"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

export const Card: React.FC<PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>{children}</div>
);

export const LoadingModal: React.FC<{ message?: string }> = ({ message = "Cargando..." }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeln">
    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
      <p className="text-lg font-medium text-gray-700">{message}</p>
    </div>
  </div>
);

export const Spinner: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <div className={`${className} border-2 border-gray-200 border-t-orange-600 rounded-full animate-spin`}></div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <input {...props} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition ${props.className}`} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <select {...props} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition appearance-none ${props.className}`}>{children}</select>
  </div>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <textarea {...props} rows={2} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition ${props.className}`} />
  </div>
);

export class ErrorBoundary extends React.Component<PropsWithChildren<{}>, { hasError: boolean; error: Error | null }> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error de renderizado capturado:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-700 rounded-lg">
          <h2 className="font-bold text-xl mb-2">¡Ups! Algo salió mal.</h2>
          <p>Ha ocurrido un error al renderizar esta sección.</p>
          <pre className="text-xs mt-4 bg-red-100 p-2 rounded overflow-auto">
            {this.state.error && this.state.error.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
