import { ARTIST } from './config';

export function ArtistCard({ onDark = false }: { onDark?: boolean }) {
  return (
    <aside className={`artist-card ${onDark ? 'on-dark' : ''}`}>
      <p>
        <span aria-hidden="true">🎧</span> Made by <strong>{ARTIST.name}</strong>. If you like this game, go listen to my music.
      </p>
      <div className="artist-links">
        {ARTIST.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </div>
    </aside>
  );
}

export function Credits() {
  return (
    <p className="credits">
      Images from <a href="https://www.vecteezy.com" target="_blank" rel="noreferrer">Vecteezy.com</a>
    </p>
  );
}
