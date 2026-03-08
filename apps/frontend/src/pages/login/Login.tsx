import { useNavigate } from '@solidjs/router';
import { createLoginCtrl } from './login.ctrl';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const ctrl = createLoginCtrl(navigate);

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-semibold text-gray-900">
            {ctrl.state.isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {ctrl.state.isRegister
              ? 'Fill in the details below to get started'
              : 'Sign in to continue to the app'}
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {ctrl.state.generalError && (
            <div class="bg-danger-light text-danger text-sm rounded-lg px-4 py-3 mb-5">
              {ctrl.state.generalError}
            </div>
          )}

          <form onSubmit={ctrl.handleSubmit} noValidate class="space-y-5">
            {ctrl.state.isRegister && (
              <Input
                label="Name"
                value={ctrl.state.name}
                onInput={(v) => ctrl.setState('name', v)}
                placeholder="Jane Doe"
                error={ctrl.state.errors.name}
              />
            )}

            <Input
              label="Email"
              type="email"
              value={ctrl.state.email}
              onInput={(v) => ctrl.setState('email', v)}
              placeholder="you@example.com"
              error={ctrl.state.errors.email}
            />

            <Input
              label="Password"
              type="password"
              value={ctrl.state.password}
              onInput={(v) => ctrl.setState('password', v)}
              placeholder="At least 8 characters"
              error={ctrl.state.errors.password}
            />

            <Button type="submit" disabled={ctrl.state.loading} class="w-full mt-2">
              {ctrl.state.loading ? 'Please wait...' : ctrl.state.isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p class="text-center text-sm text-gray-500 mt-5">
          {ctrl.state.isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={ctrl.toggleMode}
            class="text-primary font-medium hover:underline"
          >
            {ctrl.state.isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
