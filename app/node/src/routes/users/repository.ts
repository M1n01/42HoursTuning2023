import { RowDataPacket } from "mysql2";
import pool from "../../util/mysql";
import { SearchedUser, Target, User, UserForFilter } from "../../model/types";
import {
  convertToSearchedUser,
  convertToUserForFilter,
  convertToUsers,
} from "../../model/utils";

export const getUserIdByMailAndPassword = async (
  mail: string,
  hashPassword: string
): Promise<string | undefined> => {
  const [user] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM user WHERE mail = ? AND password = ?",
    [mail, hashPassword]
  );
  if (user.length === 0) {
    return;
  }

  return user[0].user_id;
};

export const getUsers = async (
  limit: number,
  offset: number
): Promise<User[]> => {
  const query = `SELECT u.user_id, u.user_name, o.office_name, u.user_icon_id, f.file_name FROM user AS u \
    LEFT JOIN office AS o ON o.office_id = u.office_id \
    LEFT JOIN file AS f ON f.file_id = u.user_icon_id \
    ORDER BY u.entry_date ASC, u.kana ASC LIMIT ${limit} OFFSET ${offset}`;

  const [rows] = await pool.query<RowDataPacket[]>(query);

  return convertToUsers(rows);
};

export const getUserByUserId = async (
  userId: string
): Promise<User | undefined> => {
  const query = `SELECT u.user_id, u.user_name, o.office_name, u.user_icon_id, f.file_name FROM user AS u \
    LEFT JOIN office AS o ON o.office_id = u.office_id \
    LEFT JOIN file AS f ON f.file_id = u.user_icon_id \
    WHERE u.user_id = '${userId}'`;

  const [user] = await pool.query<RowDataPacket[]>(query);
  if (user.length === 0) {
    return;
  }

  return {
    userId: user[0].user_id,
    userName: user[0].user_name,
    userIcon: {
      fileId: user[0].user_icon_id,
      fileName: user[0].file_name,
    },
    officeName: user[0].office_name,
  };
};

export const getUsersByUserIds = async (
  userIds: string[],
  order?: string
): Promise<SearchedUser[]> => {
  let users: SearchedUser[] = [];
  if (userIds.length === 0) {
    return [];
  }
  const inClause = userIds.map((userId) => `'${userId}'`).join(", ");

  let query = `SELECT u.user_id, u.user_name, o.office_name, u.user_icon_id, f.file_name, u.entry_date, u.kana FROM user AS u \
    LEFT JOIN office AS o ON o.office_id = u.office_id \
    LEFT JOIN file AS f ON f.file_id = u.user_icon_id \
    WHERE u.user_id IN (${inClause})`;
  if (order) {
    query += order;
  }

  const [raw_users] = await pool.query<RowDataPacket[]>(query);

  users = convertToSearchedUser(raw_users);
  return users;
};

export const getUsersByTargets = async (
  keyword: string,
  targets: Target[],
  limit: number,
  offset: number
): Promise<SearchedUser[]> => {
  // クエリを生成する
  let query = "SELECT user.user_id FROM user";
  let where = " WHERE 1 != 1 ";
  let isDRM = false;
  for (const target of targets) {
    switch (target) {
      case "userName":
        where += ` OR user.user_name LIKE '%${keyword}%'`;
        break;
      case "kana":
        where += ` OR user.kana LIKE '%${keyword}%'`;
        break;
      case "mail":
        where += ` OR user.mail LIKE '%${keyword}%'`;
        break;
      case "department":
        if (!isDRM) {
          query += ` LEFT JOIN department_role_member AS drm ON user.user_id = drm.user_id`;
          isDRM = true;
        }
        query += ` LEFT JOIN department AS d ON d.department_id = drm.department_id`;
        where += ` OR (d.department_name LIKE '%${keyword}%' AND d.active = true AND drm.belong = true)`;
        break;
      case "role":
        if (!isDRM) {
          query += ` LEFT JOIN department_role_member AS drm ON user.user_id = drm.user_id`;
          isDRM = true;
        }
        query += ` LEFT JOIN role AS r ON drm.role_id = r.role_id`;
        where += ` OR r.role_name LIKE '%${keyword}%' AND r.active = true AND drm.belong = true`;
        break;
      case "office":
        query += ` LEFT JOIN office AS o ON user.office_id = o.office_id`;
        where += ` OR o.office_name LIKE '%${keyword}%'`;
        break;
      case "skill":
        query += ` LEFT JOIN skill_member AS sm ON user.user_id = sm.user_id`;
        query += ` LEFT JOIN skill AS s ON sm.skill_id = s.skill_id`;
        where += ` OR s.skill_name LIKE '%${keyword}%'`;
        break;
      case "goal":
        where += ` OR user.goal LIKE '%${keyword}%'`;
        break;
      default:
        break;
    }
  }
  // 入社日とかなの昇順にソートする。
  query += where;
  query += ` ORDER BY user.entry_date, user.kana LIMIT ${limit} OFFSET ${offset}`;

  const [rows] = await pool.query<RowDataPacket[]>(query);
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds, " ORDER BY u.entry_date, u.kana ASC");
};

export const getUsersByKana = async (kana: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE kana LIKE ?`,
    [`%${kana}%`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByMail = async (mail: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE mail LIKE ?`,
    [`%${mail}%`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByDepartmentName = async (
  departmentName: string
): Promise<SearchedUser[]> => {
  const [departmentIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT department_id FROM department WHERE department_name LIKE ? AND active = true`,
    [`%${departmentName}%`]
  );
  const departmentIds: string[] = departmentIdRows.map(
    (row) => row.department_id
  );
  if (departmentIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE department_id IN (?) AND belong = true`,
    [departmentIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByRoleName = async (
  roleName: string
): Promise<SearchedUser[]> => {
  const [roleIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT role_id FROM role WHERE role_name LIKE ? AND active = true`,
    [`%${roleName}%`]
  );
  const roleIds: string[] = roleIdRows.map((row) => row.role_id);
  if (roleIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM department_role_member WHERE role_id IN (?) AND belong = true`,
    [roleIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByOfficeName = async (
  officeName: string
): Promise<SearchedUser[]> => {
  const [officeIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT office_id FROM office WHERE office_name LIKE ?`,
    [`%${officeName}%`]
  );
  const officeIds: string[] = officeIdRows.map((row) => row.office_id);
  if (officeIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE office_id IN (?)`,
    [officeIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersBySkillName = async (
  skillName: string
): Promise<SearchedUser[]> => {
  const [skillIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_id FROM skill WHERE skill_name LIKE ?`,
    [`%${skillName}%`]
  );
  const skillIds: string[] = skillIdRows.map((row) => row.skill_id);
  if (skillIds.length === 0) {
    return [];
  }

  const [userIdRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM skill_member WHERE skill_id IN (?)`,
    [skillIds]
  );
  const userIds: string[] = userIdRows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUsersByGoal = async (goal: string): Promise<SearchedUser[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM user WHERE goal LIKE ?`,
    [`%${goal}%`]
  );
  const userIds: string[] = rows.map((row) => row.user_id);

  return getUsersByUserIds(userIds);
};

export const getUserForFilter = async (
  userId?: string
): Promise<UserForFilter> => {
  let userRows: RowDataPacket[];
  if (!userId) {
    const offset = Math.floor(Math.random() * 300001);
    [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, office_id, user_icon_id FROM user LIMIT 1 OFFSET ?",
      [offset]
    );
  } else {
    [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, office_id, user_icon_id FROM user WHERE user_id = ?",
      [userId]
    );
  }
  const user = userRows[0];

  const [officeNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT office_name FROM office WHERE office_id = ?`,
    [user.office_id]
  );
  const [fileNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT file_name FROM file WHERE file_id = ?`,
    [user.user_icon_id]
  );
  const [departmentNameRow] = await pool.query<RowDataPacket[]>(
    `SELECT department_name FROM department WHERE department_id = (SELECT department_id FROM department_role_member WHERE user_id = ? AND belong = true)`,
    [user.user_id]
  );
  const [skillNameRows] = await pool.query<RowDataPacket[]>(
    `SELECT skill_name FROM skill WHERE skill_id IN (SELECT skill_id FROM skill_member WHERE user_id = ?)`,
    [user.user_id]
  );

  user.office_name = officeNameRow[0].office_name;
  user.file_name = fileNameRow[0].file_name;
  user.department_name = departmentNameRow[0].department_name;
  user.skill_names = skillNameRows.map((row) => row.skill_name);

  return convertToUserForFilter(user);
};
