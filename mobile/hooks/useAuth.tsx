import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Niche, CupulaAccess } from '../lib/types';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { removePushTokenFromDevice } from './useNotifications';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userId: string | null;
  userEmail: string | null;
  loading: boolean;
  accessInfo: CupulaAccess | null;
  selectedNiche: Niche | null;
  setSelectedNiche: (niche: Niche | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkAccess: (email: string, targetNiche?: Niche) => Promise<{ hasAccess: boolean; hasName: boolean }>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState<CupulaAccess | null>(null);
  const [selectedNiche, setSelectedNicheState] = useState<Niche | null>(null);

  const setSelectedNiche = useCallback(async (niche: Niche | null) => {
    setSelectedNicheState(niche);
    if (niche) {
      await AsyncStorage.setItem('selected_niche', niche);
    } else {
      await AsyncStorage.removeItem('selected_niche');
    }
  }, []);

  useEffect(() => {
    // Busca a sessão atual ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        loadAccessInfo(session.user.email);
      }
      setLoading(false);
    });

    // Ouve mudanças de autenticação (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        loadAccessInfo(session.user.email);
      } else {
        setAccessInfo(null);
        setSelectedNicheState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAccessInfo = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('cupula_access')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        const access = data as CupulaAccess;
        setAccessInfo(access);
        const userNiches = access.niches || [];
        const savedNiche = await AsyncStorage.getItem('selected_niche');
        if (savedNiche && userNiches.includes(savedNiche as Niche)) {
          setSelectedNicheState(savedNiche as Niche);
        } else if (userNiches.length > 0) {
          setSelectedNicheState(userNiches[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar informações de acesso:', err);
    }
  };

  // Replica EXATAMENTE a lógica de checkAccess do CupulaBoard.tsx (linhas 526-551)
  const checkAccess = useCallback(async (
    email: string,
    targetNiche?: Niche
  ): Promise<{ hasAccess: boolean; hasName: boolean }> => {
    try {
      const { data: sharkUser, error } = await supabase
        .from('cupula_access')
        .select('status, full_name, niches')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (sharkUser?.status === 'active') {
        // Se o nicho não for especificado (boot), aceita.
        // Se for especificado, verifica se está no array de permissões.
        const hasNicheAccess = !targetNiche || (sharkUser.niches && sharkUser.niches.includes(targetNiche));

        if (hasNicheAccess) {
          return { hasAccess: true, hasName: !!sharkUser.full_name };
        }
      }
      return { hasAccess: false, hasName: false };
    } catch (err) {
      console.error('Erro na verificação de acesso:', err);
      return { hasAccess: false, hasName: false };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erro desconhecido ao fazer login.' };
    }
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string, 
    phone?: string
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          }
        }
      });
      if (error) {
        return { error: error.message };
      }

      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            first_name: firstName || '',
            last_name: lastName || '',
            phone_number: phone || '',
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Erro ao criar perfil automaticamente:', profileError);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erro desconhecido ao cadastrar.' };
    }
  }, []);

  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    
    const { access_token, refresh_token } = params;
    if (!access_token) return;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  };

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'cupula',
        path: 'auth/callback',
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === 'success') {
          const { url } = res;
          await createSessionFromUrl(url);
          return { error: null };
        } else {
          return { error: 'Autenticação com Google cancelada.' };
        }
      } else {
        return { error: 'Não foi possível gerar a URL de autenticação.' };
      }
    } catch (err: any) {
      return { error: err.message || 'Erro ao entrar com Google.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // 1. Remove o token deste aparelho do banco para não receber notificações da conta que saiu
      await removePushTokenFromDevice();
      
      // 2. Desloga a sessão do Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao deslogar do Supabase:', err);
    } finally {
      setAccessInfo(null);
      setSelectedNicheState(null);
      await AsyncStorage.removeItem('selected_niche');
    }
  }, []);

  const refreshAccess = useCallback(async () => {
    if (user?.email) {
      await loadAccessInfo(user.email);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        loading,
        accessInfo,
        selectedNiche,
        setSelectedNiche,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        checkAccess,
        refreshAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
