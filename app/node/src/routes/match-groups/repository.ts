import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import {
  MatchGroup,
  MatchGroupConfig,
  MatchGroupDetail,
  MatchGroupDto,
  User,
} from "../../model/types";
import { getUsersByUserIds } from "../users/repository";
import {
  convertDateToString,
  convertToMatchGroupDetail,
} from "../../model/utils";

export const getCandidateUsers = async (
  owner_id: string,
  config: MatchGroupConfig
): Promise<string[]> => {
  let query = `SELECT user.user_id FROM user`;
  let where = ` WHERE 1 = 1`;

  // 自部署の社員のみ対象
  if (config.departmentFilter === "onlyMyDepartment") {
    query += ` LEFT JOIN department_role_member AS drm ON user.user_id = drm.user_id`;
    where += ` AND drm.department_id IN (SELECT DISTINCT department_id FROM department_role_member WHERE user_id = '${owner_id}' AND belong = true) AND belong = true`;
  }

  // 他部署の社員のみ対象
  if (config.departmentFilter === "excludeMyDepartment") {
    query += ` LEFT JOIN department_role_member AS drm ON user.user_id = drm.user_id`;
    where += ` AND drm.department_id NOT IN (SELECT DISTINCT department_id FROM department_role_member WHERE user_id = '${owner_id}' AND belong = true)`;
  }

  // 自拠点の社員のみ対象
  if (config.officeFilter === "onlyMyOffice") {
    where += ` AND user.office_id = (SELECT office_id FROM user WHERE user_id = '${owner_id}')`;
  }

  // 他拠点の社員のみ対象
  if (config.officeFilter === "excludeMyOffice") {
    where += ` AND user.office_id != (SELECT office_id FROM user WHERE user_id = '${owner_id}')`;
  }

  // スキルが一致する社員のみ対象
  if (config.skillFilter.length > 0) {
    const skills = config.skillFilter.map((skill) => `'${skill}'`).join(", ");
    query += ` LEFT JOIN skill_member AS sm ON user.user_id = sm.user_id LEFT JOIN skill AS s ON sm.skill_id = s.skill_id`;
    where += ` AND s.skill_name IN (${skills})`;
  }

  // 過去にマッチングしていない社員のみ対象
  if (config.neverMatchedFilter) {
    where += ` AND user.user_id NOT IN (SELECT user_id FROM match_group_member WHERE match_group_id IN (SELECT match_group_id FROM match_group WHERE user_id = '${owner_id}'))`;
  }

  query += where;
  query += ` GROUP BY user.user_id LIMIT ${config.numOfMembers}`;

  const [userRows] = await pool.query<RowDataPacket[]>(query);
  return userRows.map((row) => row.user_id);
};

export const hasSkillNameRecord = async (
  skillName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM skill WHERE EXISTS (SELECT * FROM skill WHERE skill_name = ?)",
    [skillName]
  );
  return rows.length > 0;
};

export const getUserIdsBeforeMatched = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  if (matchGroupIdRows.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id IN (?)",
    [matchGroupIdRows]
  );

  return userIdRows.map((row) => row.user_id);
};

export const insertMatchGroup = async (matchGroupDetail: MatchGroupDto) => {
  await pool.query<RowDataPacket[]>(
    "INSERT INTO match_group (match_group_id, match_group_name, description, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      matchGroupDetail.matchGroupId,
      matchGroupDetail.matchGroupName,
      matchGroupDetail.description,
      matchGroupDetail.status,
      matchGroupDetail.createdBy,
      matchGroupDetail.createdAt,
    ]
  );

  const values = matchGroupDetail.members
    .map((userId) => `('${matchGroupDetail.matchGroupId}', '${userId}')`)
    .join(", ");

  await pool.query<RowDataPacket[]>(
    `INSERT INTO match_group_member (match_group_id, user_id) VALUES ${values}`
  );
};

export const getMatchGroupDetailByMatchGroupId = async (
  matchGroupId: string,
  status?: string
): Promise<MatchGroupDetail | undefined> => {
  let query =
    "SELECT match_group_id, match_group_name, description, status, created_by, created_at FROM match_group WHERE match_group_id = ?";
  if (status === "open") {
    query += " AND status = 'open'";
  }
  const [matchGroup] = await pool.query<RowDataPacket[]>(query, [matchGroupId]);
  if (matchGroup.length === 0) {
    return;
  }

  const [matchGroupMemberIdRows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM match_group_member WHERE match_group_id = ?",
    [matchGroupId]
  );
  const matchGroupMemberIds: string[] = matchGroupMemberIdRows.map(
    (row) => row.user_id
  );

  const searchedUsers = await getUsersByUserIds(matchGroupMemberIds);
  // SearchedUserからUser型に変換
  const members: User[] = searchedUsers.map((searchedUser) => {
    const { kana: _kana, entryDate: _entryDate, ...rest } = searchedUser;
    return rest;
  });
  matchGroup[0].members = members;

  return convertToMatchGroupDetail(matchGroup[0]);
};

export const getMatchGroupIdsByUserId = async (
  userId: string
): Promise<string[]> => {
  const [matchGroupIds] = await pool.query<RowDataPacket[]>(
    "SELECT match_group_id FROM match_group_member WHERE user_id = ?",
    [userId]
  );
  return matchGroupIds.map((row) => row.match_group_id);
};

export const getMatchGroupsByMatchGroupIds = async (
  matchGroupIds: string[],
  status: string
): Promise<MatchGroup[]> => {
  const inClause = matchGroupIds.map((id) => `'${id}'`).join(",");
  let query = `SELECT mg.match_group_id, mg.match_group_name, mg.description, mg.status, mg.created_by, mg.created_at, \
    o.office_name, u.user_id, u.user_name, f.file_id, f.file_name \
    FROM match_group AS mg \
    LEFT JOIN match_group_member AS mgm ON mg.match_group_id = mgm.match_group_id \
    LEFT JOIN user AS u ON mgm.user_id = u.user_id \
    LEFT JOIN office AS o ON u.office_id = o.office_id \
    LEFT JOIN file AS f ON u.user_icon_id = f.file_id \
    WHERE mg.match_group_id IN (${inClause})`;
  if (status === "open") {
    query += " AND status = 'open'";
  }

  const [rows] = await pool.query<RowDataPacket[]>(query);

  const matchGroups: MatchGroup[] = [];
  let last_match_group_id;
  let groupNum = 0;
  let group: MatchGroup;
  for (const row of rows) {
    if (last_match_group_id !== row.match_group_id) {
      last_match_group_id = row.match_group_id;
      group = {
        matchGroupId: row.match_group_id,
        matchGroupName: row.match_group_name,
        members: [],
        status: row.status,
        createdBy: row.created_by,
        createdAt: convertDateToString(row.created_at),
      };
      matchGroups.push(group);
      groupNum++;
    }

    const member = {
      userId: row.user_id,
      userName: row.user_name,
      officeName: row.office_name,
      userIcon: {
        fileId: row.file_id,
        fileName: row.file_name,
      },
    };
    matchGroups[groupNum - 1].members.push(member);
  }
  return matchGroups;
};
