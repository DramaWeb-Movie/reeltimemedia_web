import Link from "next/link";
import Button from "@/components/ui/Button";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-lg">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-2">
          {t("error")}
        </p>
        <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-4">
          <span className="gradient-text">404</span>
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
          {t("title")}
        </h2>
        <p className="text-gray-500 text-base mb-8">{t("desc")}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/home">
            <Button variant="primary" size="lg">
              {t("backToHome")}
            </Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" size="lg">
              {t("browse")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
