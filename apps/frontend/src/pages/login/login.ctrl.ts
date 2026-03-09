import { createStore } from 'solid-js/store';
import type { Navigator } from '@solidjs/router';
import { setToken } from '../../lib/api-client';
import { login, register } from '../../domain/auth/auth.service';
import type { FieldErrors } from '../../domain/validation';

export function createLoginCtrl(navigate: Navigator, loadUser: () => Promise<void>) {
  const [state, setState] = createStore({
    email: '',
    password: '',
    name: '',
    isRegister: false,
    errors: {} as FieldErrors,
    generalError: '',
    loading: false,
  });

  function toggleMode() {
    setState({ isRegister: !state.isRegister, errors: {}, generalError: '' });
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setState({ errors: {}, generalError: '', loading: true });

    const result = state.isRegister
      ? await register(state.email, state.password, state.name)
      : await login(state.email, state.password);

    if (!result.ok) {
      if ('fieldErrors' in result) {
        setState({ errors: result.fieldErrors, loading: false });
      } else {
        setState({ generalError: result.error.message, loading: false });
      }
      return;
    }

    setToken(result.value.token);
    await loadUser();
    setState('loading', false);
    navigate('/', { replace: true });
  }

  return { state, setState, toggleMode, handleSubmit };
}
