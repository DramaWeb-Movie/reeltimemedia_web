import Link from 'next/link';
import { FiChevronRight, FiHome } from 'react-icons/fi';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-[#808080] py-4">
      <Link href="/" className="hover:text-brand-red transition-colors">
        <FiHome className="w-4 h-4" />
      </Link>
      <FiChevronRight className="text-[#333333]" />
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-red transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <FiChevronRight className="text-[#333333]" />
          )}
        </div>
      ))}
    </nav>
  );
}

