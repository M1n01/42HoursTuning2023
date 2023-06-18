import { Target, SearchedUser } from "../../model/types";
import {
  getUsersByUserName,
  getUsersByKana,
  getUsersByMail,
  getUsersByDepartmentName,
  getUsersByRoleName,
  getUsersByOfficeName,
  getUsersBySkillName,
  getUsersByGoal,
} from "./repository";

export const getUsersByKeyword = async (
  keyword: string,
  targets: Target[],
  limit: number,
  offset: number
): Promise<SearchedUser[]> => {
  let users: SearchedUser[] = [];
  for (const target of targets) {
    const oldLen = users.length;
    switch (target) {
      case "userName":
        users = users.concat(await getUsersByUserName(keyword, limit, offset));
        break;
      case "kana":
        users = users.concat(await getUsersByKana(keyword, limit, offset));
        break;
      case "mail":
        users = users.concat(await getUsersByMail(keyword, limit, offset));
        break;
      case "department":
        users = users.concat(await getUsersByDepartmentName(keyword));
        break;
      case "role":
        users = users.concat(await getUsersByRoleName(keyword));
        break;
      case "office":
        users = users.concat(await getUsersByOfficeName(keyword));
        break;
      case "skill":
        users = users.concat(await getUsersBySkillName(keyword));
        break;
      case "goal":
        users = users.concat(await getUsersByGoal(keyword, limit, offset));
        break;
    }
    console.log(`${users.length - oldLen} users found by ${target}`);
  }
  return users;
};
