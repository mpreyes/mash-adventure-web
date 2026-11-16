import { ARTIST } from './config';

export function ArtistCard({ ending = false }: { ending?: boolean }) {
  return (
    <aside className="artist-card">
      <p>
        <span className="eyebrow">By Madelyn.</span>{' '}
        {ending ? 'Liked your fortune? Support my artist project, madebit.' : 'If you like this game, support my artist project, madebit.'}
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
