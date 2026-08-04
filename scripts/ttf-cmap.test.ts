import { describe, expect, it } from 'vitest';
import { codePointsInTtf } from './ttf-cmap';

/** Минимальный sfnt с единственной таблицей `cmap`. */
function ttf(subtable: Uint8Array): ArrayBuffer {
  const header = new Uint8Array(12 + 16);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 1);
  header.set([0x63, 0x6d, 0x61, 0x70], 12); // 'cmap'
  view.setUint32(12 + 8, header.length); // смещение таблицы
  view.setUint32(12 + 12, subtable.length + 12);

  const cmap = new Uint8Array(12 + subtable.length);
  const cmapView = new DataView(cmap.buffer);
  cmapView.setUint16(0, 0); // версия
  cmapView.setUint16(2, 1); // одна подтаблица
  cmapView.setUint16(4, 3); // platformID
  cmapView.setUint16(6, 1); // encodingID
  cmapView.setUint32(8, 12); // смещение подтаблицы от начала cmap
  cmap.set(subtable, 12);

  const out = new Uint8Array(header.length + cmap.length);
  out.set(header, 0);
  out.set(cmap, header.length);

  return out.buffer;
}

/** Формат 4: один рабочий сегмент плюс обязательный завершающий 0xFFFF. */
function format4(from: number, to: number): Uint8Array {
  const bytes = new Uint8Array(14 + 4 + 2 + 4 + 4 + 4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 4);
  view.setUint16(2, bytes.length);
  view.setUint16(4, 0);
  view.setUint16(6, 4); // segCountX2 при двух сегментах
  view.setUint16(14, to); // endCode[0]
  view.setUint16(16, 0xffff); // endCode[1]
  view.setUint16(18, 0); // reservedPad
  view.setUint16(20, from); // startCode[0]
  view.setUint16(22, 0xffff); // startCode[1]

  return bytes;
}

/** Формат 12: одна группа. */
function format12(from: number, to: number): Uint8Array {
  const bytes = new Uint8Array(16 + 12);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 12);
  view.setUint32(4, bytes.length);
  view.setUint32(12, 1); // одна группа
  view.setUint32(16, from);
  view.setUint32(20, to);
  view.setUint32(24, 1); // начальный идентификатор глифа

  return bytes;
}

describe('разбор cmap', () => {
  it('читает формат 4 — его дают латинские шрифты', () => {
    const covered = codePointsInTtf(ttf(format4(0x0410, 0x0412)));

    expect(covered.has(0x0410)).toBe(true);
    expect(covered.has(0x0412)).toBe(true);
    expect(covered.has(0x0413)).toBe(false);
  });

  it('не считает покрытым завершающий сегмент 0xFFFF', () => {
    const covered = codePointsInTtf(ttf(format4(0x0410, 0x0412)));

    expect(covered.has(0xffff)).toBe(false);
  });

  it('читает формат 12 — его дают шрифты с иероглифами', () => {
    const covered = codePointsInTtf(ttf(format12(0x4e00, 0x4e02)));

    expect(covered.has(0x4e00)).toBe(true);
    expect(covered.has(0x4e02)).toBe(true);
    expect(covered.has(0x4e03)).toBe(false);
  });

  it('сообщает, если таблицы cmap нет: молча вернуть пусто нельзя', () => {
    expect(() => codePointsInTtf(new ArrayBuffer(12))).toThrow(/cmap/);
  });
});
