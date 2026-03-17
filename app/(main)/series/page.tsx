import { getMoviesPage } from '@/lib/movies';
import SeriesContent from '@/components/series/SeriesContent';

const PAGE_SIZE = 20;

export default async function SeriesPage(props: {
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const currentPage = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);

  const { items, total } = await getMoviesPage({
    type: 'series',
    status: 'published',
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <SeriesContent initialItems={items} currentPage={currentPage} totalPages={totalPages} />;
}
