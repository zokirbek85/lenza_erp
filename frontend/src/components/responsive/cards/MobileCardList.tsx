import type { Key, ReactNode } from 'react';

type MobileCardListProps<T> = {
  data: T[];
  renderCard: (item: T) => ReactNode;
  keyExtractor?: (item: T, index: number) => Key;
};

const MobileCardList = <T extends unknown>({ data, renderCard, keyExtractor }: MobileCardListProps<T>) => (
  <div className="space-y-3">
    {data.map((item, index) => (
      <div key={keyExtractor ? keyExtractor(item, index) : index}>{renderCard(item)}</div>
    ))}
  </div>
);

export default MobileCardList;
