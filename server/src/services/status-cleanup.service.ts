import { deleteStatusPhotoFromCloudinary } from "../config/cloudinary";
import { Status } from "../models/status.model";

const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

interface StatusCleanupResult {
  attemptedCount: number;
  deletedCount: number;
  failedCount: number;
}

const getAvailableCleanupFilter = (now: Date) => {
  const staleClaimDate = new Date(now.getTime() - CLEANUP_CLAIM_TIMEOUT_MS);

  return {
    expiresAt: {
      $lte: now,
    },

    $or: [
      {
        cleanupStartedAt: null,
      },
      {
        cleanupStartedAt: {
          $exists: false,
        },
      },
      {
        cleanupStartedAt: {
          $lte: staleClaimDate,
        },
      },
    ],
  };
};

export const cleanupExpiredStatuses = async (
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<StatusCleanupResult> => {
  const now = new Date();

  const candidates = await Status.find(getAvailableCleanupFilter(now))
    .select("_id")
    .sort({
      expiresAt: 1,
    })
    .limit(batchSize)
    .lean();

  let deletedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    const cleanupStartedAt = new Date();

    /**
     * Claim the status before processing it. This prevents two server
     * instances or overlapping cleanup runs from handling the same status.
     */
    const claimedStatus = await Status.findOneAndUpdate(
      {
        _id: candidate._id,
        ...getAvailableCleanupFilter(cleanupStartedAt),
      },
      {
        $set: {
          cleanupStartedAt,
        },
      },
      {
        new: true,
      },
    ).select("+photo.publicId +cleanupStartedAt +cleanupAttempts");

    if (!claimedStatus) {
      continue;
    }

    try {
      const photoPublicId = claimedStatus.get("photo.publicId") as
        | string
        | null
        | undefined;

      if (photoPublicId) {
        await deleteStatusPhotoFromCloudinary(photoPublicId);
      }

      await Status.deleteOne({
        _id: claimedStatus._id,
        cleanupStartedAt,
      });

      deletedCount += 1;
    } catch (error) {
      failedCount += 1;

      /**
       * Release the claim so a later cleanup run can try again.
       */
      await Status.updateOne(
        {
          _id: claimedStatus._id,
          cleanupStartedAt,
        },
        {
          $set: {
            cleanupStartedAt: null,
          },

          $inc: {
            cleanupAttempts: 1,
          },
        },
      ).catch((updateError: unknown) => {
        console.error(
          `Could not release cleanup claim for status ${claimedStatus._id.toString()}:`,
          updateError,
        );
      });

      console.error(
        `Could not clean expired status ${claimedStatus._id.toString()}:`,
        error,
      );
    }
  }

  return {
    attemptedCount: candidates.length,
    deletedCount,
    failedCount,
  };
};

export const startStatusCleanupJob = (
  intervalMs = DEFAULT_CLEANUP_INTERVAL_MS,
): (() => void) => {
  let cleanupIsRunning = false;

  const executeCleanup = async (): Promise<void> => {
    if (cleanupIsRunning) {
      return;
    }

    cleanupIsRunning = true;

    try {
      let result: StatusCleanupResult;

      /**
       * Continue processing batches until fewer than the maximum number
       * are returned. This also clears statuses accumulated while a free
       * hosting service was sleeping.
       */
      do {
        result = await cleanupExpiredStatuses();

        if (result.deletedCount > 0 || result.failedCount > 0) {
          console.log(
            `Status cleanup processed ${result.attemptedCount}, deleted ${result.deletedCount}, failed ${result.failedCount}.`,
          );
        }
      } while (
        result.attemptedCount === DEFAULT_BATCH_SIZE &&
        result.failedCount === 0
      );
    } catch (error) {
      console.error("Unexpected error while cleaning expired statuses:", error);
    } finally {
      cleanupIsRunning = false;
    }
  };

  /**
   * Clean old statuses immediately when the server starts.
   */
  void executeCleanup();

  const interval = setInterval(() => {
    void executeCleanup();
  }, intervalMs);

  /**
   * The cleanup timer should not keep Node running during shutdown.
   */
  interval.unref();

  return () => {
    clearInterval(interval);
  };
};
