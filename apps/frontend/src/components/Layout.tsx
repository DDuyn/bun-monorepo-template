import type { RouteSectionProps } from '@solidjs/router';

export default function Layout(props: RouteSectionProps) {
  return (
    <div class="min-h-screen bg-gray-50 font-sans">
      <nav class="bg-white border-b border-gray-100 shadow-sm">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" class="text-base font-semibold text-gray-900 tracking-tight">
            App
          </a>
        </div>
      </nav>
      <main class="max-w-4xl mx-auto px-6 py-10">{props.children}</main>
    </div>
  );
}
