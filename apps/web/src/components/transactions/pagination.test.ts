import { visiblePages } from './pagination';

describe('visiblePages', () => {
  it('mostra todas quando são poucas', () => {
    expect(visiblePages(2, 3)).toEqual([1, 2, 3]);
  });

  it('omite os intervalos distantes da página atual', () => {
    expect(visiblePages(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
  });
});
