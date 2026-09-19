import type { Game, Snapshot, Toggles } from '../game';
import type { DiscType } from '../game';
import { DISCS, DISC_KEYS, DISC_TYPES, TILE_DIAG_M, TILE_M, m } from '../game';
import styles from './Panel.module.css';

const AIDS: { key: keyof Toggles; label: string; hint: string }[] = [
  { key: 'cone', label: 'landing cone', hint: '1' },
  { key: 'shadow', label: 'disc shadow', hint: '2' },
  { key: 'rings', label: 'distance rings', hint: '3' },
  { key: 'elev', label: 'elevation shading', hint: '4' },
];

/** "4-25 m", the reach of a disc as the panel prints it. */
const reach = (type: DiscType) =>
  `${m(DISCS[type].min).toFixed(0)}-${m(DISCS[type].max).toFixed(0)} m`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export function Panel({ snap, game }: { snap: Snapshot; game: Game | null }) {
  const pct = (v: number | null) => (v === null ? '-' : `${(v * 100).toFixed(0)}%`);
  const metres = (v: number | null, digits = 1) => (v === null ? '-' : `${v.toFixed(digits)} m`);

  return (
    <div className={styles.panel}>
      <h1>
        Throw feel <span className={styles.tag}>PROTOTYPE</span>
      </h1>
      <p className={styles.muted}>
        Water / OB = +1 stroke, play from where the disc last went out.
      </p>

      <div className={styles.box}>
        <Row label="Hole" value={`${snap.holeMetres.toFixed(0)} m - ${snap.holeClass}`} />
        <Row label="Disc" value={`${snap.disc} - ${reach(snap.disc)}`} />
        <Row label="Phase" value={snap.phase} />
        <Row label="Throws" value={String(snap.throws)} />
        <Row label="Penalties" value={String(snap.penalties)} />
        <Row label="Distance to basket" value={metres(snap.distance)} />
        <hr className={styles.hr} />
        <Row label="Power" value={pct(snap.power)} />
        <Row label="Throw distance" value={metres(snap.throwMetres, 0)} />
        <Row
          label="Angle scatter σ"
          value={snap.sigAngle === null ? '-' : `${snap.sigAngle.toFixed(1)}°`}
        />
        <Row label="Distance scatter σ" value={metres(snap.sigDistance)} />
        <Row label="Tile" value={`${TILE_M} m / ${TILE_DIAG_M.toFixed(1)} m diag`} />
        <hr className={styles.hr} />
        <Row label="Last error" value={snap.lastErr} />
      </div>

      {snap.canTapIn && (
        <button className={styles.tapin} onClick={() => game?.tapIn()}>
          Hole out (tap in)
        </button>
      )}

      <div className={`${styles.box} ${styles.log}`}>{snap.log.join('\n')}</div>

      <div className={styles.box}>
        <div className={styles.muted}>Disc</div>
        {DISC_TYPES.map((type) => (
          <label key={type} className={`${styles.mode} ${snap.disc === type ? '' : styles.off}`}>
            <input
              type="radio"
              name="disc"
              value={type}
              checked={snap.disc === type}
              onChange={(e) => {
                game?.setDisc(type);
                e.currentTarget.blur();
              }}
            />
            {type} <kbd>{DISC_KEYS[type]}</kbd> {reach(type)}
          </label>
        ))}

        <div className={`${styles.muted} ${styles.aidsHead}`}>Aiming mode</div>
        {(['manual', 'timing'] as const).map((mode) => (
          <label key={mode} className={`${styles.mode} ${snap.mode === mode ? '' : styles.off}`}>
            <input
              type="radio"
              name="mode"
              value={mode}
              checked={snap.mode === mode}
              onChange={(e) => {
                game?.setMode(mode);
                e.currentTarget.blur();
              }}
            />
            {mode === 'manual' ? 'manual' : 'timing sweep'}
          </label>
        ))}

        {snap.mode === 'manual' ? (
          <div className={styles.keys}>
            <div>
              <kbd>←</kbd>
              <kbd>→</kbd> turn (hold <kbd>shift</kbd> for fine)
            </div>
            <div>
              <kbd>space</kbd> hold to charge, release to throw
            </div>
            <div>
              <kbd>esc</kbd> cancel the charge
            </div>
          </div>
        ) : (
          <div className={styles.keys}>
            <div>
              <kbd>space</kbd> aim direction → aim power → throw
            </div>
            <div>
              <kbd>esc</kbd> cancel the aim
            </div>
          </div>
        )}
        <div>
          <kbd>R</kbd> reset hole
        </div>

        <div className={`${styles.muted} ${styles.aidsHead}`}>Q2 aids - turn these OFF:</div>
        {AIDS.map((aid) => (
          <div key={aid.key}>
            <kbd>{aid.hint}</kbd> {aid.label}{' '}
            <button className={styles.aid} onClick={() => game?.toggle(aid.key)}>
              {snap.toggles[aid.key] ? 'on' : 'OFF'}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.box}>
        <p className={styles.q}>
          <b>Q1</b> Did you <i>decide</i> something, or did the game cheat you?
        </p>
        <p className={styles.q}>
          <b>Q2</b> With <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd> off, can you still tell if you'll clear the water?
        </p>
      </div>
    </div>
  );
}
