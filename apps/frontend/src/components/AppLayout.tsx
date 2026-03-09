import type { ParentProps } from 'solid-js';
import { Navbar } from './Navbar';
import { Sidebar, type NavItem } from './Sidebar';

function HomeIcon(props: { class?: string }) {
  return (
    <svg class={props.class} fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ProfileIcon(props: { class?: string }) {
  return (
    <svg class={props.class} fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Profile', href: '/profile', icon: ProfileIcon },
];

export function AppLayout(props: ParentProps) {
  return (
    <div class="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <Sidebar items={NAV_ITEMS} />
      {/* Contenido: padding-top para el navbar fijo, padding-left para el sidebar.
          El sidebar puede estar en 56px (w-14) o 224px (w-56).
          Usamos min padding-left seguro y dejamos que el contenido fluya. */}
      <main class="pt-14 pl-16 transition-all duration-200">
        <div class="max-w-4xl mx-auto px-6 py-10">
          {props.children}
        </div>
      </main>
    </div>
  );
}
