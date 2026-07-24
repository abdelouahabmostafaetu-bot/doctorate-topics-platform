import Link from "next/link";
import { isSuperAdmin } from "@/lib/notebooks";

/**
 * One elegant Arabic button on the home page, visible only to the super admin.
 */
export async function NotebooksHomeButton() {
  if (!(await isSuperAdmin())) return null;

  return (
    <div className="nb-home-wrap">
      <Link href="/notebooks" className="nb-home-btn" dir="rtl">
        <span className="nb-home-glow" aria-hidden="true" />
        <span className="nb-home-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
            <path d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5" />
            <path d="M8.5 7.5h7M8.5 11h5" />
          </svg>
        </span>
        <span className="nb-home-text">
          <span className="nb-home-title">كرّاريسي</span>
          <span className="nb-home-sub">مساحة الملاحظات والمراجعة</span>
        </span>
        <span className="nb-home-arrow" aria-hidden="true">←</span>
      </Link>
    </div>
  );
}

export default NotebooksHomeButton;
