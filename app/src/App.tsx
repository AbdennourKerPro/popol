import { useEffect, useState } from 'react';
import { Game } from './game/Game';
import { Militant } from './militant/Militant';
import { Home } from './screens/Home';
import { Explorer } from './screens/Explorer';
import { Mentions } from './screens/Mentions';

export type Mode = 'jeu' | 'militant';
type Page = Mode | 'mentions' | 'explorer';

const readMode = (): Page | null => {
  const hash = window.location.hash.slice(1);
  return hash === 'jeu' || hash === 'militant' || hash === 'mentions' || hash === 'explorer' ? hash : null;
};

export default function App() {
  const [mode, setMode] = useState<Page | null>(readMode);

  useEffect(() => {
    const sync = () => setMode(readMode());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const go = (next: Page | null) => {
    window.location.hash = next ?? '';
    setMode(next);
    window.scrollTo(0, 0);
  };

  if (mode === 'jeu') return <Game onHome={() => go(null)} onExplore={() => go('explorer')} />;
  if (mode === 'explorer') return <Explorer onHome={() => go(null)} />;
  if (mode === 'mentions') return <Mentions onHome={() => go(null)} />;
  if (mode === 'militant') return <Militant onHome={() => go(null)} onExplore={() => go('explorer')} />;
  return <Home onPick={go} />;
}
