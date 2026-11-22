import { useEffect, useState } from 'react';
import { Game } from './game/Game';
import { Militant } from './militant/Militant';
import { Home } from './screens/Home';
import { Explorer } from './screens/Explorer';
import { Mentions } from './screens/Mentions';
import { Quotidien } from './screens/Quotidien';

type Page = 'jeu' | 'quotidien' | 'militant' | 'mentions' | 'explorer';

const readMode = (): Page | null => {
  const hash = window.location.hash.slice(1);
  return hash === 'jeu' || hash === 'quotidien' || hash === 'militant' || hash === 'mentions' || hash === 'explorer' ? hash : null;
};

export default function App() {
  const [mode, setMode] = useState<Page | null>(readMode);

  useEffect(() => {
    const sync = () => setMode(readMode());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  const go = (next: Page | null) => {
    window.location.hash = next ?? '';
    setMode(next);
  };

  if (mode === 'jeu') return <Game onHome={() => go(null)} onExplore={() => go('explorer')} />;
  if (mode === 'quotidien') return <Quotidien onHome={() => go(null)} />;
  if (mode === 'explorer') return <Explorer onHome={() => go(null)} />;
  if (mode === 'mentions') return <Mentions onHome={() => go(null)} />;
  if (mode === 'militant') return <Militant onHome={() => go(null)} onExplore={() => go('explorer')} />;
  return <Home />;
}
