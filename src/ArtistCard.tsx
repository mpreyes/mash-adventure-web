import { ARTIST } from './config';

export function ArtistCard({ ending = false }: { ending?: boolean }) {
  return (
    <aside className="artist-card">
      <p>
        <span className="eyebrow">MADE BY MADEBIT.</span>{' '}
        {ending ? 'Liked your fortune? Go listen to my music.' : 'If you like this game, go listen to my music.'}
      </p>
      <div className="pills">
        {ARTIST.links.map((l, i) => (
          <a key={l.href} className={`pill ${i === 0 ? 'gold' : 'mint'}`} href={l.href} target="_blank" rel="noreferrer">{l.label.toUpperCase()}</a>
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
