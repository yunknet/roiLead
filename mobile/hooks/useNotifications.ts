import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface UseNotificationsReturn {
  expoPushToken: string | null;
  pushEnabled: boolean;
  registerForPushNotifications: () => Promise<void>;
  unregisterForPushNotifications: () => Promise<void>;
}

export async function removePushTokenFromDevice() {
  try {
    const Notifications = await import('expo-notifications');
    let projectId = undefined;
    try {
      const Constants = await import('expo-constants');
      projectId = Constants.default.expoConfig?.extra?.eas?.projectId || 
                  Constants.default.easConfig?.projectId;
    } catch (e) {}

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    if (token) {
      await supabase.rpc('remove_device_token', { p_expo_token: token });
      console.log('Push token removido com sucesso do banco via RPC.');
    }
  } catch (error) {
    console.warn('Erro ao remover push token do dispositivo:', error);
  }
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const registeredRef = useRef(false);

  const registerForPushNotifications = useCallback(async () => {
    if (!userId || registeredRef.current) return;

    try {
      // Importação dinâmica para evitar crash em ambientes sem suporte
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      if (!Device.isDevice) {
        console.log('Push notifications requerem um dispositivo físico.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada.');
        setPushEnabled(false);
        return;
      }

      // Configura para mostrar o banner de notificação mesmo com o app aberto (foreground)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      let projectId = undefined;
      try {
        const Constants = await import('expo-constants');
        projectId = Constants.default.expoConfig?.extra?.eas?.projectId || 
                    Constants.default.easConfig?.projectId;
      } catch (e) {}

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenData.data;

      setExpoPushToken(token);
      setPushEnabled(true);
      registeredRef.current = true;

      // Chama a função segura no banco de dados para garantir exclusividade do token
      await supabase.rpc('register_device_token', {
        p_user_id: userId,
        p_expo_token: token,
        p_platform: Platform.OS
      });

      // Configuração do canal de notificação no Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('cupula', {
          name: 'Cúpula de Leads',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
          sound: 'default',
        });
      }
    } catch (error) {
      console.warn('Erro ao registrar push notifications (Esperado em dev sem EAS):', error);
    }
  }, [userId]);

  const unregisterForPushNotifications = useCallback(async () => {
    if (!userId) return;
    
    await removePushTokenFromDevice();
    
    setExpoPushToken(null);
    setPushEnabled(false);
    registeredRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (userId) {
      registerForPushNotifications();
    }
  }, [userId, registerForPushNotifications]);

  return {
    expoPushToken,
    pushEnabled,
    registerForPushNotifications,
    unregisterForPushNotifications,
  };
}
