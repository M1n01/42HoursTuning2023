import { Target, SearchedUser } from "../../model/types";
import {
  getUsersByTargets,
} from "./repository";

export const getUsersByKeyword = async (
  keyword: string,
  targets: Target[],
  limit: number,
  offset: number,
): Promise<SearchedUser[]> => {
  const users: SearchedUser[] = await getUsersByTargets(keyword, targets, limit, offset);
  return users;
};
