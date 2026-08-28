import { expect, it } from 'vitest';
import { dynasties } from './dynasties';
import { rulerOfDynasty, rulers } from './rulers';

it('на династию приходится не больше одного правителя', () => {
  const ids = rulers.map((ruler) => ruler.dynastyId);

  expect(new Set(ids).size).toBe(ids.length);
});

it('каждый правитель ссылается на династию и на источник', () => {
  for (const ruler of rulers) {
    expect(dynasties.some((dynasty) => dynasty.id === ruler.dynastyId)).toBe(
      true,
    );
    expect(ruler.sourceIds.length).toBeGreaterThan(0);
    expect(ruler.nameZh.length).toBeGreaterThan(0);
  }
});

/*
 * Троецарствие — эпоха трёх государств сразу, единственного правителя у неё
 * нет. Решение владельца продукта 2026-08-28: в игру она не идёт.
 */
it('у Троецарствия правителя нет', () => {
  expect(rulerOfDynasty('three-kingdoms')).toBeUndefined();
  expect(rulers).toHaveLength(dynasties.length - 1);
});

/*
 * Правление пересекается со сроком своей династии — там, где годы известны.
 * Именно пересекается, а не лежит внутри: Хубилай стал ханом в 1260 году, а
 * державу переименовали в Юань только в 1271-м. Обе даты верны, и требовать
 * вложенности значило бы соврать в одной из них. Пересечения довольно, чтобы
 * поймать настоящую ошибку — правителя Тан с цинскими годами.
 */
it('правление пересекается со сроком династии', () => {
  for (const ruler of rulers) {
    if (ruler.from === undefined || ruler.to === undefined) {
      continue;
    }

    const dynasty = dynasties.find((item) => item.id === ruler.dynastyId)!;

    expect(ruler.from).toBeLessThanOrEqual(dynasty.to);
    expect(ruler.to).toBeGreaterThanOrEqual(dynasty.from);
  }
});

/*
 * Годы есть не у всех, и это не пробел в данных: у Юя их не даёт предание, а
 * датировку Чэн Тана «Британника» прямо называет спорной. У таких записей
 * обязана стоять пометка — иначе экран промолчит о том, что даты нет.
 */
it('запись без годов помечена преданием', () => {
  for (const ruler of rulers) {
    if (ruler.from === undefined || ruler.to === undefined) {
      expect(ruler.legendary).toBe(true);
    }
  }

  expect(rulerOfDynasty('xia')?.legendary).toBe(true);
  expect(rulerOfDynasty('qin')?.legendary).toBeUndefined();
});
