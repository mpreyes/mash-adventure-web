import { useEffect, useMemo, useState } from 'react';
import { drawCard, owner, shareUrl, tagline, FORTUNE_LABELS, type Shared } from './share';
import { endingTitle } from './endings';

/** The fortune card as an image, so what you see is exactly what gets shared. */
export function FortuneCard({ s }: { s: Shared }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let url = '';
    let live = true;
    drawCard(s).then((b) => { url = URL.createObjectURL(b); if (live) setSrc(url); }).catch(() => undefined);
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [JSON.stringify(s)]); // eslint-disable-line react-hooks/exhaustive-deps
  const alt = `${owner(s.n)}, magic number ${s.m}. I got ${endingTitle(s.e)}. ${tagline(s)} ${FORTUNE_LABELS.map((l, i) => `${l}: ${s.a[i]}`).join(', ')}.`;
  return (
    <figure className="fortune-card">
      {src ? <img src={src} alt={alt} /> : <div className="fortune-card-wait" role="img" aria-label={alt} />}
    </figure>
  );
}

// Phones get one button that opens the share menu with the image attached; desktop gets save + copy.
const canShareFiles = (() => {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
})();

export function ShareButtons({ s }: { s: Shared }) {
  const url = useMemo(() => shareUrl(s), [s]);
  const [note, setNote] = useState('');
  const file = async () => new File([await drawCard(s)], 'my-mash-fortune.png', { type: 'image/png' });
  const text = `I got ${endingTitle(s.e)} in M.A.S.H. Adventure! What's yours? ${url}`;

  const share = async () => {
    try {
      await navigator.share({ files: [await file()], text });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote("Couldn't open sharing. Try saving the image instead.");
    }
  };
  const save = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await file());
    a.download = 'my-mash-fortune.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNote('Link copied!'); } catch { setNote(url); }
  };

  return (
    <div className="share-row">
      {canShareFiles ? (
        <button className="btn btn-pink" onClick={share}>SHARE MY FORTUNE</button>
      ) : (
        <div className="share-pair">
          <button className="btn btn-pink" onClick={save}>SAVE IMAGE</button>
          <button className="btn btn-pink" onClick={copy}>COPY LINK</button>
        </div>
      )}
      <p className="share-note" role="status">{note}</p>
    </div>
  );
}
