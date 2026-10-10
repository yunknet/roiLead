import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function CupulaLeads() {
  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full flex flex-col items-center justify-center bg-muted/20">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <CupulaVturbVideo />
        <div className="bg-card border border-border p-8 sm:p-12 rounded-3xl shadow-lg relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 p-12 bg-blue-500/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 p-12 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/cupula-icon.png" alt="Cúpula" className="w-16 h-16 object-contain dark:hidden" />
              <img src="/cupula-icon-dark.png" alt="Cúpula" className="w-16 h-16 object-contain hidden dark:block" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-foreground">A Cúpula de Leads</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Um ecossistema exclusivo onde leads gerados através de tráfego pago são distribuídos de forma <strong>100% justa e rotativa</strong>.
            </p>
            <Link to="/cupula-de-leads">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto h-12 px-8 text-lg font-medium shadow-lg shadow-blue-600/20">Acessar a Cúpula de Leads</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const CupulaVturbVideo = () => {
  useEffect(() => {
    const scriptId = 'vturb-script-69ecd2dae1dcfbd062a45c66';
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = 'https://scripts.converteai.net/9b95671b-5a37-4971-bb6c-6d970b6b4a27/players/69ecd2dae1dcfbd062a45c66/v4/player.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);
  return (
    <div className="w-full flex items-center justify-center rounded-3xl overflow-hidden shadow-lg border border-border">
      {/* @ts-expect-error Vturb custom element */}
      <vturb-smartplayer id="vid-69ecd2dae1dcfbd062a45c66" style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: '400px' }}></vturb-smartplayer>
    </div>
  );
};
