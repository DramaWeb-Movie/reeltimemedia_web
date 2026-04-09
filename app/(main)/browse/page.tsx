import {
  getBrowseGenres,
  getBrowseMoviesPage,
  type BrowseAccessFilter,
  type BrowseTypeFilter,
} from '@/lib/movies';
import BrowseContent from '@/components/browse/BrowseContent';

const PAGE_SIZE = 12;
export const revalidate = 60;

type BrowsePageSearchParams = {
  q?: string | string[];
  access?: string | string[];
  type?: string | string[];
  genre?: string | string[];
  page?: string | string[];
};

function pickFirst(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeAccess(value: string): BrowseAccessFilter {
  return value === 'free' || value === 'paid' ? value : 'all';
}

function normalizeType(value: string): BrowseTypeFilter {
  return value === 'movie' || value === 'series' ? value : 'all';
}

export default async function BrowsePage(props: {
  searchParams?: Promise<BrowsePageSearchParams>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = pickFirst(searchParams.q).trim();
  const access = normalizeAccess(pickFirst(searchParams.access));
  const type = normalizeType(pickFirst(searchParams.type));
  const genre = pickFirst(searchParams.genre).trim();
  const currentPage = Math.max(1, Number.parseInt(pickFirst(searchParams.page) || '1', 10) || 1);

  const [browseResult, genresResult] = await Promise.allSettled([
    getBrowseMoviesPage({
      q,
      access,
      type,
      genre,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getBrowseGenres(),
  ]);

  const browse = browseResult.status === 'fulfilled'
    ? browseResult.value
    : { items: [], total: 0 };
  const allGenres = genresResult.status === 'fulfilled' ? genresResult.value : [];

  if (browseResult.status === 'rejected') {
    console.error('BrowsePage getBrowseMoviesPage failed:', browseResult.reason);
  }
  if (genresResult.status === 'rejected') {
    console.error('BrowsePage getBrowseGenres failed:', genresResult.reason);
  }

  const totalPages = Math.max(1, Math.ceil(browse.total / PAGE_SIZE));

  return (
    <BrowseContent
      key={`browse:${q}:${access}:${type}:${genre}:${currentPage}`}
      initialItems={browse.items}
      allGenres={allGenres}
      currentPage={currentPage}
      totalPages={totalPages}
      totalResults={browse.total}
      filters={{ q, access, type, genre }}
    />
  );
}
