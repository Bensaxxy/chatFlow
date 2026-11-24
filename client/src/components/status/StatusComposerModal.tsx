"use client";

import {
  Check,
  Globe2,
  ImagePlus,
  LoaderCircle,
  Search,
  Type,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import { useStatuses } from "@/contexts/StatusContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { searchUsers } from "@/services/user.service";
import type {
  ChatStatus,
  StatusAudience,
  StatusBackground,
} from "@/types/status";
import type { SearchUser } from "@/types/user";

interface StatusComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (status: ChatStatus) => void;
}

type StatusMode = "text" | "photo";

const backgrounds: Array<{
  value: StatusBackground;
  label: string;
  previewClassName: string;
  buttonClassName: string;
}> = [
  {
    value: "slate",
    label: "Slate",
    previewClassName: "bg-gradient-to-br from-slate-700 to-slate-950",
    buttonClassName: "bg-slate-800",
  },
  {
    value: "cyan",
    label: "Cyan",
    previewClassName:
      "bg-gradient-to-br from-cyan-400 via-cyan-600 to-blue-700",
    buttonClassName: "bg-cyan-600",
  },
  {
    value: "violet",
    label: "Violet",
    previewClassName:
      "bg-gradient-to-br from-violet-400 via-violet-600 to-purple-800",
    buttonClassName: "bg-violet-600",
  },
  {
    value: "emerald",
    label: "Emerald",
    previewClassName:
      "bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800",
    buttonClassName: "bg-emerald-600",
  },
  {
    value: "rose",
    label: "Rose",
    previewClassName:
      "bg-gradient-to-br from-rose-400 via-rose-600 to-pink-800",
    buttonClassName: "bg-rose-600",
  },
  {
    value: "amber",
    label: "Amber",
    previewClassName:
      "bg-gradient-to-br from-amber-300 via-orange-500 to-orange-700",
    buttonClassName: "bg-amber-500",
  },
];

const audiences: Array<{
  value: StatusAudience;
  label: string;
  description: string;
  icon: typeof Globe2;
}> = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Every ChatFlow user can view this status.",
    icon: Globe2,
  },
  {
    value: "people_i_chat_with",
    label: "People I chat with",
    description: "Only people who share a conversation with you.",
    icon: Users,
  },
  {
    value: "selected_users",
    label: "Selected people",
    description: "Only the people you choose can view it.",
    icon: UserCheck,
  },
  {
    value: "except_users",
    label: "Everyone except",
    description: "Hide this status from selected people.",
    icon: UserMinus,
  },
];

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export default function StatusComposerModal({
  isOpen,
  onClose,
  onCreated,
}: StatusComposerModalProps) {
  const { theme } = useChatTheme();
  const { createTextStatus, createPhotoStatus } = useStatuses();

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  const [mode, setMode] = useState<StatusMode>("text");

  const [text, setText] = useState("");

  const [caption, setCaption] = useState("");

  const [backgroundColor, setBackgroundColor] =
    useState<StatusBackground>("cyan");

  const [textColor, setTextColor] = useState<"light" | "dark">("light");

  const [audience, setAudience] =
    useState<StatusAudience>("people_i_chat_with");

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [audienceUsers, setAudienceUsers] = useState<SearchUser[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);

  const [isSearching, setIsSearching] = useState(false);

  const [searchError, setSearchError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (audience !== "selected_users" && audience !== "except_users") {
      setSearchResults([]);
      setSearchQuery("");
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    setIsSearching(true);
    setSearchError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const users = await searchUsers(normalizedQuery, controller.signal);

        setSearchResults(users);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchError(getApiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [audience, searchQuery]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const resetForm = (): void => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setMode("text");
    setText("");
    setCaption("");
    setBackgroundColor("cyan");
    setTextColor("light");
    setAudience("people_i_chat_with");
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setAudienceUsers([]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
  };

  const handleClose = (): void => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const selectedPhoto = event.target.files?.[0];

    event.target.value = "";

    if (!selectedPhoto) {
      return;
    }

    if (!allowedPhotoTypes.has(selectedPhoto.type)) {
      toast.error("Status photos must be JPEG, PNG, or WebP images.");

      return;
    }

    if (selectedPhoto.size > MAX_PHOTO_SIZE) {
      toast.error("Status photo cannot exceed 10 MB.");

      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoFile(selectedPhoto);

    setPhotoPreviewUrl(URL.createObjectURL(selectedPhoto));

    setMode("photo");
  };

  const toggleAudienceUser = (selectedUser: SearchUser): void => {
    setAudienceUsers((currentUsers) => {
      const userIsSelected = currentUsers.some(
        (user) => user._id === selectedUser._id,
      );

      if (userIsSelected) {
        return currentUsers.filter((user) => user._id !== selectedUser._id);
      }

      if (currentUsers.length >= 100) {
        toast.error("You can select a maximum of 100 people.");

        return currentUsers;
      }

      return [...currentUsers, selectedUser];
    });
  };

  const requiresAudienceUsers =
    audience === "selected_users" || audience === "except_users";

  const formIsValid =
    mode === "text" ? text.trim().length > 0 : photoFile !== null;

  const audienceIsValid = !requiresAudienceUsers || audienceUsers.length > 0;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!formIsValid || !audienceIsValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedUserIds =
        audience === "selected_users"
          ? audienceUsers.map((user) => user._id)
          : [];

      const excludedUserIds =
        audience === "except_users"
          ? audienceUsers.map((user) => user._id)
          : [];

      const status =
        mode === "text"
          ? await createTextStatus({
              text: text.trim(),
              backgroundColor,
              textColor,
              audience,
              selectedUserIds,
              excludedUserIds,
            })
          : await createPhotoStatus({
              photo: photoFile!,
              caption: caption.trim(),
              audience,
              selectedUserIds,
              excludedUserIds,
            });

      toast.success("Status shared successfully");

      onCreated?.(status);

      resetForm();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || !isOpen) {
    return null;
  }

  const selectedBackground =
    backgrounds.find((background) => background.value === backgroundColor) ??
    backgrounds[1];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-composer-title"
      data-chat-appearance={theme.appearance}
      data-chat-bubble-color={theme.bubbleColor}
      className="status-themed status-composer-themed fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="status-composer-title"
              className="text-lg font-bold text-slate-950"
            >
              Create status
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Your update disappears after 24 hours.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close status composer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "text"
                      ? "bg-white text-cyan-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Type className="h-4 w-4" />
                  Text
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (photoFile) {
                      setMode("photo");
                    } else {
                      photoInputRef.current?.click();
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "photo"
                      ? "bg-white text-cyan-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ImagePlus className="h-4 w-4" />
                  Photo
                </button>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {mode === "text" ? (
                <>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={700}
                    rows={5}
                    placeholder="What's happening?"
                    aria-label="Status text"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />

                  <div className="mt-2 flex justify-end">
                    <span className="text-xs text-slate-400">
                      {text.length}/700
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Background
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {backgrounds.map((background) => (
                        <button
                          key={background.value}
                          type="button"
                          onClick={() => setBackgroundColor(background.value)}
                          aria-label={`${background.label} background`}
                          aria-pressed={backgroundColor === background.value}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                            background.buttonClassName
                          } ${
                            backgroundColor === background.value
                              ? "border-slate-950 ring-2 ring-slate-300 ring-offset-2"
                              : "border-white hover:scale-105"
                          }`}
                        >
                          {backgroundColor === background.value && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Text colour
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTextColor("light")}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          textColor === "light"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Light
                      </button>

                      <button
                        type="button"
                        onClick={() => setTextColor("dark")}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          textColor === "dark"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Status preview"
                        className="h-72 w-full object-contain"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="flex h-72 w-full flex-col items-center justify-center text-slate-400"
                      >
                        <ImagePlus className="h-10 w-10" />
                        <span className="mt-3 text-sm">Select a photo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:bg-white"
                    >
                      Change photo
                    </button>
                  </div>

                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Add a caption..."
                    aria-label="Photo status caption"
                    className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />

                  <div className="mt-2 flex justify-end">
                    <span className="text-xs text-slate-400">
                      {caption.length}/300
                    </span>
                  </div>
                </>
              )}
            </div>

            <aside className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </p>

              <div
                className={`relative flex h-[320px] items-center justify-center overflow-hidden rounded-3xl ${
                  mode === "text"
                    ? selectedBackground.previewClassName
                    : "bg-slate-950"
                }`}
              >
                {mode === "text" ? (
                  <p
                    className={`max-h-[260px] w-full overflow-hidden whitespace-pre-wrap break-words px-6 text-center text-2xl font-bold leading-relaxed ${
                      textColor === "light" ? "text-white" : "text-slate-950"
                    }`}
                  >
                    {text.trim() || "Your status preview"}
                  </p>
                ) : photoPreviewUrl ? (
                  <>
                    <img
                      src={photoPreviewUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />

                    {caption.trim() && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-5 pt-12">
                        <p className="break-words text-center text-sm text-white">
                          {caption.trim()}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <ImagePlus className="h-12 w-12 text-slate-600" />
                )}
              </div>
            </aside>
          </div>

          <div className="border-t border-slate-200 px-5 py-5">
            <p className="mb-3 text-sm font-bold text-slate-900">
              Who can view this?
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {audiences.map((audienceOption) => {
                const Icon = audienceOption.icon;

                const isSelected = audience === audienceOption.value;

                return (
                  <button
                    key={audienceOption.value}
                    type="button"
                    onClick={() => {
                      setAudience(audienceOption.value);

                      if (
                        audienceOption.value !== "selected_users" &&
                        audienceOption.value !== "except_users"
                      ) {
                        setAudienceUsers([]);
                      }
                    }}
                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {audienceOption.label}
                      </span>

                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {audienceOption.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {requiresAudienceUsers && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {audience === "selected_users"
                    ? "Choose viewers"
                    : "Choose people to exclude"}
                </p>

                {audienceUsers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audienceUsers.map((selectedUser) => (
                      <button
                        key={selectedUser._id}
                        type="button"
                        onClick={() => toggleAudienceUser(selectedUser)}
                        className="flex items-center gap-2 rounded-full bg-cyan-50 py-1 pl-1 pr-2 text-xs font-medium text-cyan-800 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <UserAvatar
                          name={selectedUser.name}
                          avatarUrl={selectedUser.avatarUrl}
                          className="h-6 w-6"
                          fallbackClassName="bg-cyan-100 text-[10px] font-semibold text-cyan-800"
                        />

                        <span className="max-w-28 truncate">
                          {selectedUser.name}
                        </span>

                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search people"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />

                  {isSearching && (
                    <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-600" />
                  )}
                </div>

                {searchError && (
                  <p className="mt-2 text-xs text-red-600">{searchError}</p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {searchResults.map((searchUser) => {
                      const isSelected = audienceUsers.some(
                        (user) => user._id === searchUser._id,
                      );

                      return (
                        <button
                          key={searchUser._id}
                          type="button"
                          onClick={() => toggleAudienceUser(searchUser)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                        >
                          <UserAvatar
                            name={searchUser.name}
                            avatarUrl={searchUser.avatarUrl}
                            className="h-9 w-9"
                            fallbackClassName="bg-slate-100 text-xs font-semibold text-slate-700"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {searchUser.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {searchUser.email}
                            </p>
                          </div>

                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-cyan-600 bg-cyan-600 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!formIsValid || !audienceIsValid || isSubmitting}
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}

            {isSubmitting ? "Sharing..." : "Share status"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
