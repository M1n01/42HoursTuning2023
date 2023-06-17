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

  const withoutOwner = candidates.filter((candidate) => candidate != matchGroupConfig.ownerId);
  // ownerを含んでいる場合があるので切り詰める、足りない分はundefinedになる
  withoutOwner.length = matchGroupConfig.numOfMembers - 1;

  const members = [matchGroupConfig.ownerId, ...withoutOwner].filter((member) => member !== undefined);

  // 指定した条件に合うユーザーがいない場合は400エラーにする
  if (members.length < matchGroupConfig.numOfMembers) {
    console.log("指定した条件に合うユーザーがいません");
    console.log("members.length: " + members.length);
    console.log("matchGroupConfig.numOfMembers: " + matchGroupConfig.numOfMembers);
    return;
  }

  const matchGroupId = uuidv4();
  await insertMatchGroup({
    matchGroupId,
    matchGroupName: matchGroupConfig.matchGroupName,
    description: matchGroupConfig.description,
    members,
    status: "open",
    createdBy: matchGroupConfig.ownerId,
    createdAt: new Date(),
  });

  return await getMatchGroupDetailByMatchGroupId(matchGroupId);
};
