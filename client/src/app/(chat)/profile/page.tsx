"use client";

import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  LoaderCircle,
  Mail,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import ChatFlowLoader from "@/components/shared/ChatFlowLoader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { getApiErrorMessage } from "@/lib/api/errors";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import MessageAlertSettings from "@/components/profile/MessageAlertSettings";
import PrivacySettings from "@/components/profile/PrivacySettings";
import PushNotificationSettings from "@/components/profile/PushNotificationSettings";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const formatJoinedDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

export default function ProfilePage() {
  const { user, updateProfile, updateAvatar, removeAvatar } = useAuth();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name ?? "");

  const [bio, setBio] = useState(user?.bio ?? "");

  const [isSaving, setIsSaving] = useState(false);

  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const [isRemoveAvatarModalOpen, setIsRemoveAvatarModalOpen] =
    useState(false);

  useEffect(() => {
    if (!user) return;

    setName(user.name);
    setBio(user.bio ?? "");
  }, [user?.name, user?.bio]);

  if (!user) {
    return <ChatFlowLoader message="Loading your profile..." />;
  }

  const trimmedName = name.trim();
  const trimmedBio = bio.trim();

  const profileHasChanged =
    trimmedName !== user.name || trimmedBio !== (user.bio ?? "");

  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 60;

  const handleReset = (): void => {
    setName(user.name);
    setBio(user.bio ?? "");
  };

  const handleAvatarSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || isUpdatingAvatar) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error("Select a JPEG, PNG, or WebP image");

      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Profile picture cannot exceed 5 MB");

      return;
    }

    try {
      setIsUpdatingAvatar(true);

      await updateAvatar(file);

      toast.success("Profile picture updated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async (): Promise<void> => {
    if (!user.avatarUrl || isUpdatingAvatar) {
      return;
    }

    try {
      setIsUpdatingAvatar(true);

      await removeAvatar();

      toast.success("Profile picture removed successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUpdatingAvatar(false);
      setIsRemoveAvatarModalOpen(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!isNameValid) {
      toast.error("Name must contain between 2 and 60 characters");

      return;
    }

    if (trimmedBio.length > 160) {
      toast.error("Bio cannot exceed 160 characters");

      return;
    }

    if (!profileHasChanged || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      await updateProfile({
        name: trimmedName,
        bio: trimmedBio,
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="profile-page flex h-full min-h-0 w-full flex-col bg-slate-50">
      <header className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link
          href="/chats"
          aria-label="Back to chats"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="font-semibold text-slate-950">Profile</h1>

          <p className="text-xs text-slate-500">
            Manage your personal information
          </p>
        </div>
      </header>

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-start">
          <form onSubmit={handleSubmit} className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-8">
                <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
                  <div className="relative">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/70 bg-white text-2xl font-bold text-cyan-700 shadow-lg">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>

                    {isUpdatingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60">
                        <LoaderCircle className="h-7 w-7 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 min-w-0 flex-1 text-white sm:ml-5 sm:mt-0">
                    <h2 className="truncate text-xl font-bold">{user.name}</h2>

                    <p className="mt-1 truncate text-sm text-cyan-50">
                      {user.email}
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => void handleAvatarSelection(event)}
                        disabled={isUpdatingAvatar}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUpdatingAvatar}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdatingAvatar ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}

                        {user.avatarUrl ? "Change picture" : "Upload picture"}
                      </button>

                      {user.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setIsRemoveAvatarModalOpen(true)}
                          disabled={isUpdatingAvatar}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-cyan-100">
                      JPEG, PNG or WebP. Maximum size: 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Display name
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      minLength={2}
                      maxLength={60}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between text-xs">
                    <span
                      className={isNameValid ? "text-slate-500" : "text-red-600"}
                    >
                      Use between 2 and 60 characters.
                    </span>

                    <span className="text-slate-400">{name.length}/60</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="profile-email"
                      type="email"
                      value={user.email}
                      readOnly
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-500 outline-none"
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    Email changes are not currently available.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="profile-bio"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Bio
                    </label>

                    <span
                      className={`text-xs ${
                        bio.length > 160 ? "text-red-600" : "text-slate-400"
                      }`}
                    >
                      {bio.length}/160
                    </span>
                  </div>

                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={160}
                    rows={4}
                    placeholder="Tell people something about yourself..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />

                  <span>
                    Joined ChatFlow in {formatJoinedDate(user.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!profileHasChanged || isSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !profileHasChanged ||
                    !isNameValid ||
                    bio.length > 160 ||
                    isSaving
                  }
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-6 lg:sticky lg:top-0">
            <PushNotificationSettings />
            <MessageAlertSettings />
            <PrivacySettings />
            <ChangePasswordForm />
          </aside>
        </div>
      </div>

      <ConfirmModal
        isOpen={isRemoveAvatarModalOpen}
        title="Remove profile picture?"
        description="Your current profile picture will be removed from ChatFlow."
        confirmLabel="Remove picture"
        isConfirming={isUpdatingAvatar}
        onConfirm={() => void handleRemoveAvatar()}
        onClose={() => setIsRemoveAvatarModalOpen(false)}
      />
    </section>
  );
}
