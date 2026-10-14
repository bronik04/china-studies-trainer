/**
 * Остались ли на карте итога цели, о которых не спрашивали. Сравнивается с
 * целым справочником, а не с пулом раунда: карта рисует все области, и после
 * «Повторить ошибки» несыгранными стоят те, что в пул не попали. Считаются
 * разные цели, а не попытки: у заполнения карты на одну цель их бывает три.
 */
export function hasUnaskedTargets(
  attempts: readonly { readonly target: { readonly id: string } }[],
  catalogue: readonly { readonly id: string }[],
): boolean {
  return new Set(attempts.map((attempt) => attempt.target.id)).size < catalogue.length;
}
