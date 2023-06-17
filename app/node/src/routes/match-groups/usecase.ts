import { v4 as uuidv4 } from "uuid";
import {
  MatchGroupDetail,
  MatchGroupConfig,
  UserForFilter,
} from "../../model/types";
import {
  getMatchGroupDetailByMatchGroupId,
  getUserIdsBeforeMatched,
  hasSkillNameRecord,
  insertMatchGroup,
} from "./repository";
import { getCandidateUsers, getUserForFilter } from "../users/repository";

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
  timeout?: number
): Promise<MatchGroupDetail | undefined> => {
  const candidates = await getCandidateUsers(matchGroupConfig.ownerId, matchGroupConfig);

  const members = [matchGroupConfig.ownerId, ...candidates];

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

const isPassedDepartmentFilter = (
  departmentFilter: string,
  ownerDepartment: string,
  candidateDepartment: string
) => {
  return departmentFilter === "onlyMyDepartment"
    ? ownerDepartment === candidateDepartment
    : ownerDepartment !== candidateDepartment;
};

const isPassedOfficeFilter = (
  officeFilter: string,
  ownerOffice: string,
  candidateOffice: string
) => {
  return officeFilter === "onlyMyOffice"
    ? ownerOffice === candidateOffice
    : ownerOffice !== candidateOffice;
};

const isPassedMatchFilter = async (ownerId: string, candidateId: string) => {
  const userIdsBeforeMatched = await getUserIdsBeforeMatched(ownerId);
  return userIdsBeforeMatched.every(
    (userIdBeforeMatched) => userIdBeforeMatched !== candidateId
  );
};
