import { IconChevronLeft, IconChevronRight } from './Icons';

export default function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-mute">
      <span>
        {total} résultat{total > 1 ? 's' : ''} · page {page}/{totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary !px-3 !py-2"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Page précédente"
        >
          <IconChevronLeft />
        </button>
        <button
          className="btn-secondary !px-3 !py-2"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Page suivante"
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}
