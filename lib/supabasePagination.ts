// PostgREST (and therefore Supabase) caps a single request at 1000 rows by
// default. Several tables in this project (most notably `products`, once a
// manufacturer's full price list has been imported) have long since grown
// past that limit. Any query that doesn't page through results silently
// drops everything after row 1000 - with no error, just missing data. This
// helper repeatedly calls a query builder with `.range()` until a short page
// signals the end, so callers always get the complete result set.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    all.push(...(data || []));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}
