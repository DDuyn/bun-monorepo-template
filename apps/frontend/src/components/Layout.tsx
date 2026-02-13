import type { RouteSectionProps } from '@solidjs/router';

export default function Layout(props: RouteSectionProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" class="text-lg font-semibold text-gray-900">
            App
          </a>
        </div>
      </nav>
      <main class="max-w-4xl mx-auto px-4 py-8">{props.children}</main>
    </div>
  );
}
