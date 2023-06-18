import { Target, SearchedUser } from "../../model/types";
import { getUsersByTargets } from "./repository";

export const getUsersByKeyword = async (
  keyword: string,
  targets: Target[],
  limit: number,
  offset: number
): Promise<SearchedUser[]> => {
  return await getUsersByTargets(keyword, targets, limit, offset);
};
