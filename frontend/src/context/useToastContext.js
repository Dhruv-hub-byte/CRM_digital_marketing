import { useContext } from 'react';
import { ToastContext } from '../components/Layout';

export default function useToastContext() {
  return useContext(ToastContext);
}