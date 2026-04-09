import { getMoviesPage } from '@/lib/movies';
import MoviesContent from '@/components/movies/MoviesContent';

const PAGE_SIZE = 20;
export const revalidate = 60;

export default async function MoviesPage(props: {
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const currentPage = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);

  const { items, total } = await getMoviesPage({
    type: 'single',
    status: 'published',
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <MoviesContent
      initialItems={items}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}
