import { useNavigate } from 'react-router-dom';
import {
  Link as LinkIcon,
  LockKeyhole,
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
          <LockKeyhole size={14} />
          <span>Workspace privado</span>
        </div>
        <h1 className='landing__hero-title animate-fade-in-up'>{APP_NAME}</h1>
        <p className='landing__hero-subtitle animate-fade-in-up-delay-1'>
          {APP_TAGLINE}
        </p>
        <p className='landing__hero-description animate-fade-in-up-delay-2'>
          Tellee no es una marca publica en esta etapa. Sus conceptos de intake,
          preguntas y brief completo viven como infraestructura interna detras
          del diagnostico de Entity Builders.
        </p>
        <button
          className='landing__cta animate-fade-in-up-delay-3'
          onClick={handleCTA}
          type='button'
        >
          {user ? 'Abrir dashboard' : 'Ingresar al workspace'}
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
            Conserva el modelo original de links de briefing para uso interno y
            pruebas controladas.
          </p>
        </div>
        <div className='landing__feature glass-card animate-fade-in-up-delay-1'>
          <div className='landing__feature-icon'>
            <Sparkles size={20} />
          </div>
          <h3>IA que Organiza</h3>
          <p>
            El motor privado extrae campos, preguntas del visitante y riesgos
            antes de preparar un brief.
          </p>
        </div>
        <div className='landing__feature glass-card animate-fade-in-up-delay-2'>
          <div className='landing__feature-icon'>
            <Shield size={20} />
          </div>
          <h3>Todo Guardado</h3>
          <p>
            Entity Builders consume esta capacidad del lado servidor sin mostrar
            Tellee como segunda marca publica.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className='landing__footer'>
        <p>
          Infraestructura interna de{' '}
          <span className='landing__footer-brand'>Entity Builders</span>
        </p>
      </footer>
    </div>
  );
}
