import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockPageNumbers } from "@/lib/mock-catalog";
import styles from "./mock-sessions.module.css";

export function MockPagination({ page, totalPages, disabled, onChange }: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Mock pages">
      <button type="button" aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} aria-hidden /></button>
      {mockPageNumbers(page, totalPages).map((number) => <button key={number} type="button" aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} disabled={disabled} onClick={() => onChange(number)}>{number}</button>)}
      <button type="button" aria-label="Next page" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={17} aria-hidden /></button>
    </nav>
  );
}
