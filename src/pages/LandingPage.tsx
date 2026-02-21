import { useNavigate } from 'react-router-dom';
import {
  MessageSquareText,
  Link as LinkIcon,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { APP_NAME, APP_TAGLINE } from '../constants';
import './LandingPage.css';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <div className='landing'>
      {/* Hero */}
      <section className='landing__hero'>
        <div className='landing__hero-badge animate-fade-in-up'>
          <Sparkles size={14} />
          <span>AI-Powered</span>
        </div>
        <h1 className='landing__hero-title animate-fade-in-up'>{APP_NAME}</h1>
        <p className='landing__hero-subtitle animate-fade-in-up-delay-1'>
          {APP_TAGLINE}
        </p>
        <p className='landing__hero-description animate-fade-in-up-delay-2'>
          Creá links únicos para tus clientes. Ellos describen lo que necesitan
          con sus palabras, la IA lo organiza para vos en un brief profesional.
        </p>
        <button
          className='landing__cta animate-fade-in-up-delay-3'
          onClick={handleCTA}
          type='button'
        >
          {user ? 'Ir al Dashboard' : 'Empezar Gratis'}
        </button>
      </section>

      {/* Features */}
      <section className='landing__features'>
        <div className='landing__feature glass-card animate-fade-in-up'>
          <div className='landing__feature-icon'>
            <LinkIcon size={20} />
          </div>
          <h3>Links Compartibles</h3>
          <p>
            Generá un link por proyecto y compartilo con tu cliente por WhatsApp
            o email.
          </p>
        </div>
        <div className='landing__feature glass-card animate-fade-in-up-delay-1'>
          <div className='landing__feature-icon'>
            <Sparkles size={20} />
          </div>
          <h3>IA que Organiza</h3>
          <p>
            La IA extrae datos clave, identifica preguntas del cliente y sugiere
            lo que falta preguntar.
          </p>
        </div>
        <div className='landing__feature glass-card animate-fade-in-up-delay-2'>
          <div className='landing__feature-icon'>
            <Shield size={20} />
          </div>
          <h3>Todo Guardado</h3>
          <p>
            Cada briefing queda guardado en tu dashboard. Historial completo por
            cliente.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className='landing__footer'>
        <p>
          Hecho con ✨ por{' '}
          <span className='landing__footer-brand'>Entity Builders</span>
        </p>
      </footer>
    </div>
  );
}
