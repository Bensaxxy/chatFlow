import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface UploadAvatarOptions {
  buffer: Buffer;
  publicId: string;
}

export const uploadAvatarToCloudinary = ({
  buffer,
  publicId,
}: UploadAvatarOptions): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "chatflow/avatars",
        public_id: publicId,
        resource_type: "image",
        transformation: [
          {
            width: 500,
            height: 500,
            crop: "fill",
            gravity: "face",
          },
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary did not return an upload result"));

          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });

export const deleteAvatarFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
};
