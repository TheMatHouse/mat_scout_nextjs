// components/shared/Avatar.jsx
import Image from "next/image";

export default function Avatar({ src, alt = "User avatar", size = "md" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const className = `${sizes[size] || sizes.md} rounded-full object-cover`;

  return (
    <Image
      src={src || "/default-avatar.png"}
      alt={alt}
      width={96}
      height={96}
      className={className}
      priority
    />
  );
}
