import { App } from '@capacitor/app';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';

import {
  supabase,
  isSupabaseConfigured,
} from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const updateSession = useCallback((nextSession) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setAuthError(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setUser(null);
      setAuthError({
        type: 'supabase_not_configured',
        message: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return undefined;
    }

    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      updateSession(nextSession);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        updateSession(data.session);
      } catch (error) {
        if (!mounted) return;

        console.error('Erro ao recuperar sessão:', error);
        setSession(null);
        setUser(null);
        setAuthError({
          type: 'session_error',
          message: error.message || 'Não foi possível recuperar a sessão.',
        });
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateSession]);


  // Recebe links de confirmação e recuperação enviados ao aplicativo Android.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let mounted = true;
    let listenerHandle;

    const navigateTo = (path) => {
      if (!mounted) return;
      window.history.replaceState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleAuthUrl = async (rawUrl) => {
      if (!rawUrl || !mounted) return;

      try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'vitalstep:' ||
            url.hostname !== 'auth' ||
            url.pathname !== '/callback') return;

        const params = new URLSearchParams(url.search);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''));

        const code = params.get('code');
        const tokenHash = params.get('token_hash') || hash.get('token_hash');
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const type = params.get('type') || hash.get('type');
        const next = params.get('next');

        let result;

        if (code) {
          result = await supabase.auth.exchangeCodeForSession(code);
        } else if (tokenHash && type) {
          result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
        } else if (accessToken && refreshToken) {
          result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else {
          throw new Error('O link não contém um código de autenticação válido.');
        }

        if (result.error) throw result.error;
        if (!mounted) return;

        const isRecovery = type === 'recovery' || next === '/reset-password';

        if (isRecovery) {
          setIsPasswordRecovery(true);
          navigateTo('/reset-password');
        } else {
          setIsPasswordRecovery(false);
          navigateTo('/login?confirmed=1');
        }
      } catch (error) {
        console.error('Erro ao processar link de autenticação:', error);
        if (mounted) {
          setAuthError({
            type: 'auth_callback_error',
            message: error.message || 'Não foi possível validar o link.',
          });
          navigateTo('/login?confirmation_error=1');
        }
      }
    };

    const setupListener = async () => {
      try {
        listenerHandle = await App.addListener('appUrlOpen', ({ url }) => {
          handleAuthUrl(url);
        });

        const launch = await App.getLaunchUrl();
        if (launch?.url) await handleAuthUrl(launch.url);
      } catch (error) {
        console.error('Erro ao configurar links do aplicativo:', error);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      listenerHandle?.remove();
    };
  }, []);

  const checkUserAuth = useCallback(async () => {
    if (!supabase) return null;

    setIsLoadingAuth(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      updateSession(data.session);
      return data.session?.user ?? null;
    } catch (error) {
      setAuthError({
        type: 'session_error',
        message: error.message || 'Falha ao verificar autenticação.',
      });
      updateSession(null);
      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [updateSession]);

  const logout = useCallback(async (shouldRedirect = true) => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    updateSession(null);

    if (shouldRedirect) {
      window.location.assign('/login');
    }
  }, [updateSession]);

  const navigateToLogin = useCallback(() => {
    window.location.assign('/login');
  }, []);

  const checkAppState = checkUserAuth;

  const value = {
    user,
    session,
    isAuthenticated: Boolean(user),
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
    authChecked,
    isPasswordRecovery,
    logout,
    navigateToLogin,
    checkUserAuth,
    checkAppState,
    isSupabaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
