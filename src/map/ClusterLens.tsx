import { useEffect, useRef, type ReactNode } from 'react';
import type { MapCluster } from './cluster';

/**
 * Гроздь на карте: свёрнутая — один знак и число, раскрытая — лупа.
 *
 * Знак рисует слой и передаёт сюда: род знака — его дело, а не грозди. Здесь
 * только поведение, общее для городов и достопримечательностей.
 *
 * `label` — и подпись, и признак: пока его нет, гроздь не отвечает на нажатие
 * и не берёт фокус. То же правило, что у городов: разметка называет цель ровно
 * тогда, когда в неё можно попасть.
 */

export type ClusterLensProps = {
  readonly cluster: MapCluster;
  readonly open: boolean;
  readonly label?: string;
  /**
   * Радиус цели нажатия свёрнутой грозди. Приходит снаружи, потому что задан в
   * пикселях экрана и делится на увеличение: гроздь не знает ни того, ни
   * другого, а WCAG 2.2 (2.5.8) требует 24 px независимо от вида карты.
   */
  readonly hitRadius: number;
  /** Знак свёрнутой грозди — рисуется в её середине. */
  readonly mark: ReactNode;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  /** Содержимое раскрытой лупы: знаки на местах `lensX`, `lensY`. */
  readonly children: ReactNode;
};

/** Кружок с числом отходит от знака вверх-вправо. */
const BADGE_OFFSET = 5;
const BADGE_RADIUS = 3.6;

export function ClusterLens({
  cluster,
  open,
  label,
  hitRadius,
  mark,
  onOpen,
  onClose,
  children,
}: ClusterLensProps) {
  const hit = useRef<SVGCircleElement>(null);
  const group = useRef<SVGGElement>(null);
  /*
   * Фокус возвращается на гроздь только после Esc. При уходе по Tab гроздь
   * тоже сворачивается, но возвращать туда фокус нельзя: это заперло бы
   * ученика в грозди, из которой он как раз выходил.
   */
  const returnsFocus = useRef(false);

  useEffect(() => {
    if (open) {
      group.current?.querySelector<SVGElement>('[data-cluster-member]')?.focus();

      return;
    }

    if (returnsFocus.current) {
      returnsFocus.current = false;
      hit.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <g className="map-cluster" data-cluster-id={cluster.id}>
        {mark}
        <circle
          className="cluster-badge"
          cx={cluster.x + BADGE_OFFSET}
          cy={cluster.y - BADGE_OFFSET}
          r={BADGE_RADIUS}
          aria-hidden="true"
        />
        <text
          className="cluster-count"
          x={cluster.x + BADGE_OFFSET}
          y={cluster.y - BADGE_OFFSET + BADGE_RADIUS * 0.36}
          textAnchor="middle"
          aria-hidden="true"
        >
          {cluster.members.length}
        </text>
        <circle
          ref={hit}
          className="cluster-hit"
          cx={cluster.x}
          cy={cluster.y}
          r={hitRadius}
          role={label === undefined ? undefined : 'button'}
          aria-label={label}
          aria-hidden={label === undefined ? 'true' : undefined}
          tabIndex={label === undefined ? -1 : 0}
          onClick={label === undefined ? undefined : onOpen}
          onKeyDown={
            label === undefined
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen?.();
                  }
                }
          }
        />
      </g>
    );
  }

  return (
    <g
      ref={group}
      className="map-cluster"
      data-cluster-id={cluster.id}
      data-open="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          returnsFocus.current = true;
          onClose?.();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose?.();
        }
      }}
    >
      <circle
        className="cluster-lens"
        cx={cluster.x}
        cy={cluster.y}
        r={cluster.radius}
        aria-hidden="true"
      />
      <circle
        className="cluster-anchor"
        cx={cluster.x}
        cy={cluster.y}
        r={1}
        aria-hidden="true"
      />
      {children}
    </g>
  );
}
