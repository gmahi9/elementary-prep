import { useEffect, useRef, useState } from 'react';
import type { ProviderId } from '../lib/account';
import { Tap } from './visuals';

const labels: Record<ProviderId, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
};

export function AccountBar({
  providers,
  name,
  onSignIn,
  onLogout,
}: {
  providers: ProviderId[];
  name: string | null;
  onSignIn: (provider: ProviderId) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!name && providers.length === 0) return null;
  return (
    <div className="account" ref={wrap}>
      <Tap type="button" className="ghost account-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {name || 'Sign in'}
      </Tap>
      {open && (
        <div className="menu" role="menu">
          {name ? (
            <Tap type="button" className="ghost" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
              Log out
            </Tap>
          ) : (
            providers.map((provider) => (
              <Tap
                key={provider}
                type="button"
                className="ghost"
                role="menuitem"
                onClick={() => onSignIn(provider)}
              >
                {labels[provider]}
              </Tap>
            ))
          )}
        </div>
      )}
    </div>
  );
}
