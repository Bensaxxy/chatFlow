"use client";

import { useEffect, useState } from "react";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

const getInitials = (name?: string | null): string => {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
};

export default function UserAvatar({
  name,
  avatarUrl,
  className = "h-10 w-10",
  fallbackClassName = "bg-cyan-100 font-semibold text-cyan-800",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const displayName = name?.trim() || "User";

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showImage = Boolean(avatarUrl && !imageFailed);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className} ${fallbackClassName}`}
    >
      {showImage ? (
        <img
          src={avatarUrl ?? undefined}
          alt={displayName}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(displayName)}</span>
      )}
    </div>
  );
}
