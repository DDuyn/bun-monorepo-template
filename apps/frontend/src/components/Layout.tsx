import { onMount } from 'solid-js';
import { useLocation } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { AppLayout } from './AppLayout';
import { useAuth } from '../context/auth.context';

export default function Layout(props: RouteSectionProps) {
  const location = useLocation();
  const auth = useAuth();

  onMount(() => {
    if (location.pathname !== '/login') {
      void auth.loadUser();
    }
  });

  if (location.pathname === '/login') {
    return <>{props.children}</>;
  }

  return <AppLayout>{props.children}</AppLayout>;
}
