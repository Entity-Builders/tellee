import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Navigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { APP_NAME } from '../constants';
import './LoginPage.css';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to='/dashboard' replace />;

  return (
    <div className='login-page'>
      <div className='login-page__card glass-card'>
        <div className='login-page__header'>
          <div className='login-page__logo'>
            <MessageSquareText size={22} />
          </div>
          <h1 className='login-page__title'>{APP_NAME}</h1>
          <p className='login-page__subtitle'>
            Ingresá para gestionar el workspace privado
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#8b5cf6',
                  brandAccent: '#7c3aed',
                  inputBackground: 'rgba(26, 26, 38, 0.7)',
                  inputBorder: 'rgba(139, 92, 246, 0.12)',
                  inputText: '#f1f0f5',
                  inputPlaceholder: '#5d5b6e',
                },
                borderWidths: {
                  buttonBorderWidth: '0px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '9999px',
                  buttonBorderRadius: '9999px',
                  inputBorderRadius: '12px',
                },
              },
            },
          }}
          providers={[]}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Contraseña',
                button_label: 'Iniciar sesión',
                link_text: '¿Ya tenés cuenta? Iniciá sesión',
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Contraseña',
                button_label: 'Registrarse',
                link_text: '¿No tenés cuenta? Registrate',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
