import { useEffect, useRef, useState } from 'react';
import type { ProviderId } from '../lib/account';
import { progressNotice } from '../lib/progress';
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

export function SavePrompt({
  signedIn,
  known,
  providers,
  onSignIn,
}: {
  signedIn: boolean;
  known: boolean;
  providers: ProviderId[];
  onSignIn: (provider: ProviderId) => void;
}) {
  const [open, setOpen] = useState(false);
  const notice = progressNotice(signedIn, providers.length);
  if (!known || !notice) return null;
  if (providers.length === 0) return <p className="save-note">{notice}</p>;
  if (providers.length === 1) {
    return (
      <p className="save-note">
        <button type="button" className="texty" onClick={() => onSignIn(providers[0])}>{notice}</button>
      </p>
    );
  }
  return (
    <p className="save-note">
      <button type="button" className="texty" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {notice}
      </button>
      {open && (
        <span className="save-choices">
          {providers.map((provider) => (
            <button key={provider} type="button" className="texty" onClick={() => onSignIn(provider)}>
              {labels[provider]}
            </button>
          ))}
        </span>
      )}
    </p>
  );
}
