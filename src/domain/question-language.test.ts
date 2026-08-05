import { labelOf, langOf } from './question-language';

const gansu = { nameRu: 'Ганьсу', nameZh: '甘肃省' };

it('берёт русское название или иероглифы по языку вопроса', () => {
  expect(labelOf(gansu, 'ru')).toBe('Ганьсу');
  expect(labelOf(gansu, 'zh')).toBe('甘肃省');
});

it('помечает языком только иероглифы', () => {
  expect(langOf('zh')).toBe('zh-Hans');
  expect(langOf('ru')).toBeUndefined();
});
