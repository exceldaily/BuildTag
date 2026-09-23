"use client";

import { ImagePlus, Star, Trash2, User } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { deletePhotoAction, reorderPhotosAction, updatePhotoCaptionAction } from "@/lib/actions/photos";
import { setHeroPhotoAction, setProfilePhotoAction } from "@/lib/actions/vehicles";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, photoUrl } from "@/lib/storage";
import type { VehiclePhotoRow, VehicleRow } from "@/lib/types";
import { cn } from "@/lib/utils";

import { SortableItem, SortableList } from "./sortable";

interface Props {
  vehicle: VehicleRow;
  photos: VehiclePhotoRow[];
  limit: number;
}

export function PhotoManager({ vehicle, photos: initial, limit }: Props) {
  const [photos, setPhotos] = useState(initial);
  const [hero, setHero] = useState(vehicle.hero_image_url);
  const [profile, setProfile] = useState(vehicle.profile_image_url);
  const [uploading, setUploading] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (photos.length + list.length > limit) {
        toast.error(`Your plan allows ${limit} photos per vehicle.`);
        return;
      }
      for (const file of list) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
          toast.error(`${file.name}: use JPEG, PNG or WebP.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name}: over 10 MB.`);
          continue;
        }
        setUploading((u) => [...u, file.name]);
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch(`/api/vehicles/${vehicle.id}/photos`, { method: "POST", body });
          const data = (await res.json()) as { ok: boolean; photo?: VehiclePhotoRow; heroSet?: boolean; error?: string };
          if (!res.ok || !data.ok || !data.photo) throw new Error(data.error ?? "Upload failed");
          setPhotos((p) => [...p, data.photo!]);
          if (data.heroSet) setHero(photoUrl(data.photo.storage_path, "full"));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setUploading((u) => u.filter((n) => n !== file.name));
        }
      }
    },
    [limit, photos.length, vehicle.id],
  );

  const remove = (photo: VehiclePhotoRow) => {
    if (!window.confirm("Delete this photo?")) return;
    const url = photoUrl(photo.storage_path, "full");
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    if (hero === url) setHero(null);
    if (profile === url) setProfile(null);
    start(async () => {
      const res = await deletePhotoAction(photo.id);
      if (!res.ok) toast.error(res.error);
    });
  };

  const makeHero = (photo: VehiclePhotoRow) => {
    const url = photoUrl(photo.storage_path, "full");
    setHero(url);
    start(async () => {
      const res = await setHeroPhotoAction(vehicle.id, url);
      if (!res.ok) toast.error(res.error);
      else toast.success("Hero photo updated");
    });
  };

  const makeProfile = (photo: VehiclePhotoRow) => {
    const url = photoUrl(photo.storage_path, "full");
    setProfile(url);
    start(async () => {
      const res = await setProfilePhotoAction(vehicle.id, url);
      if (!res.ok) toast.error(res.error);
      else toast.success("Profile image updated");
    });
  };

  const reorder = (next: VehiclePhotoRow[]) => {
    setPhotos(next);
    start(async () => {
      const res = await reorderPhotosAction(vehicle.id, next.map((p) => p.id));
      if (!res.ok) toast.error(res.error);
    });
  };

  const saveCaption = (photo: VehiclePhotoRow, caption: string) => {
    start(async () => {
      const res = await updatePhotoCaptionAction(photo.id, caption, caption);
      if (!res.ok) toast.error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Photos</h2>
        <span className="label-tech">
          {photos.length} / {limit}
        </span>
      </div>

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center transition-colors hover:border-foreground/40 hover:bg-white/5",
          photos.length >= limit && "pointer-events-none opacity-50",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
      >
        <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
        <span className="mt-3 font-display text-sm font-bold tracking-[0.12em] uppercase">Add photos</span>
        <span className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP up to 10 MB. Drag and drop or tap.</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {uploading.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground" aria-live="polite">
          {uploading.map((n) => (
            <li key={n}>Uploading {n}…</li>
          ))}
        </ul>
      )}

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet. The first one you add becomes the hero image.</p>
      ) : (
        <SortableList items={photos} onReorder={reorder} grid>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => {
              const url = photoUrl(p.storage_path, "full");
              const isHero = hero === url;
              const isProfile = profile === url;
              return (
                <SortableItem key={p.id} id={p.id} className="panel overflow-hidden">
                  {(handle) => (
                    <li className="flex flex-col">
                      <div className="relative aspect-[4/3] bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(p.storage_path, "thumb")} alt={p.alt_text || "Vehicle photo"} className="size-full object-cover" loading="lazy" />
                        <div className="absolute top-1 left-1 flex gap-1">
                          {isHero && <span className="rounded bg-signal px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-white uppercase">Hero</span>}
                          {isProfile && <span className="rounded bg-background/90 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase">Profile</span>}
                        </div>
                        <div className="absolute top-1 right-1 rounded bg-background/80">{handle}</div>
                      </div>
                      <input
                        type="text"
                        defaultValue={p.caption}
                        placeholder="Caption"
                        maxLength={200}
                        aria-label="Caption"
                        onBlur={(e) => e.target.value !== p.caption && saveCaption(p, e.target.value)}
                        className="border-t border-line bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:bg-white/5"
                      />
                      <div className="flex items-center justify-between border-t border-line px-1 py-1">
                        <button type="button" onClick={() => makeHero(p)} disabled={pending || isHero} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40" title="Set as hero">
                          <Star className="size-3.5" aria-hidden="true" /> Hero
                        </button>
                        <button type="button" onClick={() => makeProfile(p)} disabled={pending || isProfile} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40" title="Set as profile image">
                          <User className="size-3.5" aria-hidden="true" /> Profile
                        </button>
                        <button type="button" onClick={() => remove(p)} disabled={pending} className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete photo">
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )}
                </SortableItem>
              );
            })}
          </ul>
        </SortableList>
      )}
    </div>
  );
}
