import { v4 as uuidv4 } from "uuid";
import {
  MatchGroupDetail,
  MatchGroupConfig,
} from "../../model/types";
import {
  getMatchGroupDetailByMatchGroupId,
  hasSkillNameRecord,
  insertMatchGroup,
} from "./repository";
import { getCandidateUsers } from "../users/repository";

export const checkSkillsRegistered = async (
  skillNames: string[]
): Promise<string | undefined> => {
  for (const skillName of skillNames) {
    if (!(await hasSkillNameRecord(skillName))) {
      return skillName;
    }
  }

  return;
};

export const createMatchGroup = async (
  matchGroupConfig: MatchGroupConfig,
): Promise<MatchGroupDetail | undefined> => {
  const candidates = await getCandidateUsers(matchGroupConfig.ownerId, matchGroupConfig);

  const members = [matchGroupConfig.ownerId, ...candidates];
  // membersに自分が含まれている場合もあるので、重複を削除
  const unique = [...new Set(members)];

  // TODO: 指定した条件に合うユーザーがいない場合は400エラーにする

  const matchGroupId = uuidv4();
  await insertMatchGroup({
    matchGroupId,
    matchGroupName: matchGroupConfig.matchGroupName,
    description: matchGroupConfig.description,
    members: unique,
    status: "open",
    createdBy: matchGroupConfig.ownerId,
    createdAt: new Date(),
  });

  return await getMatchGroupDetailByMatchGroupId(matchGroupId);
};
