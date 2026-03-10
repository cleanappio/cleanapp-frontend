import React, { useState, useMemo } from "react";
import Image from "next/image";
import TextToImage from "../TextToImage";
import { getDisplayableImage } from "@/lib/image-utils";

interface ReportImageProps {
  reportSeq?: number;
  image: number[] | string | null;
  classification: "physical" | "digital";
  text: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

const ReportImage: React.FC<ReportImageProps> = ({
  reportSeq,
  image,
  classification,
  text,
  alt,
  priority = false,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);

  // Memoize image URL calculation to prevent repeated calls
  const imageUrl = useMemo(() => {
    return getDisplayableImage(image);
  }, [image]);

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageUrl && !imageError) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={imageUrl}
          alt={alt}
          width={400}
          height={160}
          className="rounded-t-xl w-full h-32 sm:h-40 object-cover"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={handleImageError}
        />
      </div>
    );
  }

  // Fallback UI when no image or image failed
  return (
    <div
      className={`rounded-t-xl w-full h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden ${className}`}
    >
      {text ? (
        <TextToImage text={text} />
      ) : (
        <p className="text-gray-500 text-sm">No image available</p>
      )}
    </div>
  );
};

export default ReportImage;
