/**
 * Место под фотографию, которой ещё нет.
 *
 * Не `<img>` с заглушкой: пустого изображения не существует, и alt на нём
 * соврал бы читалке экрана. Здесь стоит обычный текст — что должно попасть в
 * кадр, — поэтому и зрячий, и незрячий читают одно и то же: снимка нет.
 *
 * Штриховка — тот же второй канал, что и на карте: слот отличается от
 * заполненной карточки не только тоном.
 */

export type PhotoSlotProps = {
  /** Что должно быть на снимке: «Бадалин», «праздник весны». */
  readonly subject: string;
  /** Высота кадра в вёрстке. Пропорции у разных мест разные. */
  readonly height: 'card' | 'hero' | 'thumb' | 'stage';
};

export function PhotoSlot({ subject, height }: PhotoSlotProps) {
  return (
    <div className="photo-slot" data-photo-height={height}>
      <span className="photo-slot-label">Фото: {subject}</span>
      <span className="photo-slot-note">снимок ещё не подобран</span>
    </div>
  );
}
