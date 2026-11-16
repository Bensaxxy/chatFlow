import { User } from "../models/user.model";
import type { SearchUsersInput } from "../validations/user.validation";

const escapeRegularExpression = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const searchUsers = async (
  currentUserId: string,
  input: SearchUsersInput,
) => {
  const safeSearch = escapeRegularExpression(input.q);

  const searchExpression = new RegExp(safeSearch, "i");

  const users = await User.find({
    _id: {
      $ne: currentUserId,
    },

    $or: [
      {
        name: searchExpression,
      },
      {
        email: searchExpression,
      },
    ],
  })
    .select("name email avatarUrl bio lastSeenAt createdAt")
    .sort({
      name: 1,
    })
    .limit(input.limit)
    .lean();

  return users;
};
