import { useContext } from 'react';
import { ToastContext } from '../components/Layout';

export default function useToastContext() {
  const context = useContext(ToastContext);
  // Return a no-op function if context not available
  // prevents crash if called outside Layout
  return context || (() => {});
}