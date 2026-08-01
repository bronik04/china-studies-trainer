export type RegionKind =
  | 'province'
  | 'autonomous-region'
  | 'municipality'
  | 'sar';

export type Fact = {
  readonly title: string;
  readonly body: string;
  readonly sourceIds: readonly string[];
  readonly imageAlt?: string;
};

export type Source = {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
  readonly accessedAt: string;
  readonly covers: readonly string[];
};

export type Region = {
  readonly id: string;
  readonly kind: RegionKind;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  readonly capitalRu: string;
  readonly capitalZh: string;
  readonly mapAreaId: string;
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};
