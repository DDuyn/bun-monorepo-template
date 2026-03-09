import { Show, onMount } from 'solid-js';
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

  return (
    <Show
      when={location.pathname !== '/login'}
      fallback={<>{props.children}</>}
    >
      <AppLayout>{props.children}</AppLayout>
    </Show>
  );
}
