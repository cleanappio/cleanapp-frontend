import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useTranslations } from "@/lib/i18n";

export default function ImageDisplay({
  imageUrl,
  className,
}: {
  imageUrl: string;
  className?: string;
}) {
  const { t } = useTranslations();
  return (
    <Dialog>
      <DialogTrigger className="flex justify-center items-center w-full">
        <Image
          src={imageUrl}
          alt={t("reportDetails")}
          width={400}
          height={160}
          className={`w-full h-96 object-cover rounded-lg shadow-md cursor-pointer ${className}`}
          onError={(e) => {
            console.error("Failed to load image:", imageUrl);
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      </DialogTrigger>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[90%] overflow-scroll p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("reportDetails")}</DialogTitle>
        <Image
          src={imageUrl}
          alt={t("reportDetails")}
          width={400}
          height={160}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error("Failed to load image:", imageUrl);
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
