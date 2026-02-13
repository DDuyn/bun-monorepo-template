import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { api, setToken } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [name, setName] = createSignal('');
  const [isRegister, setIsRegister] = createSignal(false);
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isRegister()
        ? await api.auth.register({ email: email(), password: password(), name: name() })
        : await api.auth.login({ email: email(), password: password() });

      setToken(result.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 class="text-xl font-semibold text-center mb-6">
          {isRegister() ? 'Create account' : 'Sign in'}
        </h1>

        {error() && (
          <div class="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error()}</div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          {isRegister() && (
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading()}
            class="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading() ? '...' : isRegister() ? 'Register' : 'Sign in'}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-4">
          {isRegister() ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister())}
            class="text-blue-600 hover:underline"
          >
            {isRegister() ? 'Sign in' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
