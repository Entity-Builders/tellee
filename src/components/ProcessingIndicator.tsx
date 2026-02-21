import { Sparkles } from 'lucide-react';
import './ProcessingIndicator.css';

export function ProcessingIndicator() {
  return (
    <div className='processing animate-fade-in-up'>
      <div className='processing__orb'>
        <Sparkles size={28} />
      </div>
      <div className='processing__text'>
        <h3 className='processing__title'>Curando tu briefing...</h3>
        <p className='processing__subtitle'>
          Analizando entidades, organizando especificaciones
        </p>
      </div>
      <div className='processing__dots'>
        <span className='processing__dot' />
        <span className='processing__dot' />
        <span className='processing__dot' />
      </div>
    </div>
  );
}
