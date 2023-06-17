import express from "express";
import { execSync } from "child_process";
import { getUsers } from "./repository";
import { getUserByUserId } from "./repository";
import { getFileByFileId } from "../files/repository";
import { SearchedUser, Target, User } from "../../model/types";
import { getUsersByKeyword } from "./usecase";

export const usersRouter = express.Router();

// ユーザーアイコン画像取得API
usersRouter.get(
  "/user-icon/:userIconId",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const userIconId: string = req.params.userIconId;

    try {
      const userIcon = await getFileByFileId(userIconId);
      if (!userIcon) {
        res.status(404).json({
          message:
            "指定されたユーザーアイコンIDのユーザーアイコン画像が見つかりません。",
        });
        console.warn("specified user icon not found");
        return;
      }
      const path = userIcon.path;
      // 500px x 500pxでリサイズ
      const data = execSync(`convert ${path} -resize 500x500! PNG:-`, {
        shell: "/bin/bash",
      });
      res.status(200).json({
        fileName: userIcon.fileName,
        data: data.toString("base64"),
      });
      console.log("successfully get user icon");
    } catch (e) {
      next(e);
    }
  }
);

// ユーザー一覧取得API
usersRouter.get(
  "/",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let limit = Math.trunc(Number(req.query.limit));
    if (Number.isNaN(limit) || limit < 0 || 100 < limit) {
      limit = 20;
    }

    let offset = Math.trunc(Number(req.query.offset));
    if (Number.isNaN(offset) || offset < 0) {
      offset = 0;
    }

    try {
      const users = await getUsers(limit, offset);
      res.status(200).json(users);
      console.log("successfully get users list");
    } catch (e) {
      next(e);
    }
  }
);

// ユーザー検索API
usersRouter.get(
  "/search",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const keyword = req.query.q;
    if (typeof keyword !== "string") {
      if (!keyword) {
        res.status(400).json({ message: "検索キーワードを指定してください。" });
        console.warn("keyword not specified");
        return;
      }
      res
        .status(400)
        .json({ message: "検索キーワードは1つのみ指定してください。" });
      console.warn("multiple keyword specified");
      return;
    }
    if (keyword.length < 2 || 50 < keyword.length) {
      res.status(400).json({
        message: "検索キーワードは2文字以上50文字以下で指定してください。",
      });
      console.warn("specified keyword length too short or long");
      return;
    }

    let targets: string[] = [];
    if (typeof req.query.target === "string") {
      targets.push(req.query.target as string);
    } else if (Array.isArray(req.query.target)) {
      targets = req.query.target as string[];
    } else {
      targets = [
        "userName",
        "kana",
        "mail",
        "department",
        "role",
        "office",
        "skill",
        "goal",
      ];
    }
    if (!isValidTarget(targets)) {
      res.status(400).json({ message: "不正なtargetが指定されています。" });
      console.warn("invalid target specified");
      return;
    }

    let limit = Math.trunc(Number(req.query.limit));
    if (Number.isNaN(limit) || limit < 0 || 100 < limit) {
      limit = 20;
    }

    let offset = Math.trunc(Number(req.query.offset));
    if (Number.isNaN(offset) || offset < 0) {
      offset = 0;
    }
    try {
      const duplicateUsers = await getUsersByKeyword(
        keyword,
        targets as Target[]
      );
      if (duplicateUsers.length === 0) {
        res.json([]);
        console.log("no user found");
        return;
      }

      // 重複ユーザーを削除
      let uniqueUsers: SearchedUser[] = [];
      duplicateUsers.forEach((user) => {
        if (
          !uniqueUsers.some((uniqueUser) => uniqueUser.userId === user.userId)
        ) {
          uniqueUsers = uniqueUsers.concat(user);
        }
      });

      // User型に変換
      const users: User[] = uniqueUsers
        .slice(offset, offset + limit)
        .map((user) => {
          return {
            userId: user.userId,
            userName: user.userName,
            userIcon: {
              fileId: user.userIcon.fileId,
              fileName: user.userIcon.fileName,
            },
            officeName: user.officeName,
          };
        });
      res.json(users);
      console.log(`successfully searched ${users.length} users`);
    } catch (e) {
      next(e);
    }
  }
);

const isValidTarget = (targets: string[]): boolean => {
  const validTargets: Target[] = [
    "userName",
    "kana",
    "mail",
    "department",
    "role",
    "office",
    "skill",
    "goal",
  ];

  return targets.every((target) => validTargets.includes(target as Target));
};

// ログインユーザー取得API
usersRouter.get(
  "/login-user",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const userId = req.headers["X-DA-USER-ID"] as string;

      const user = await getUserByUserId(userId);
      if (!user) {
        res.status(404).json({ message: "ユーザーが見つかりませんでした。" });
        console.warn("session user is not found");
        return;
      }
      res.status(200).json(user);
      console.log("successfully get login user");
    } catch (e) {
      next(e);
    }
  }
);
