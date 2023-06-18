import express from "express";
import { MatchGroupConfig } from "../../model/types";
import { checkSkillsRegistered, createMatchGroup } from "./usecase";
import { getUserByUserId } from "../users/repository";
import {
  getMatchGroupIdsByUserId,
  getMatchGroupsByMatchGroupIds,
} from "./repository";

export const matchGroupRouter = express.Router();

// マッチグループ作成API
matchGroupRouter.post(
  "/",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!isReqBodyTypeCorrect(req, res)) {
      return;
    }
    try {
      const reqBody: MatchGroupConfig = {
        ownerId: req.headers["X-DA-USER-ID"] as string,
        matchGroupName: req.body.matchGroupName,
        description: req.body.description,
        numOfMembers: req.body.numOfMembers,
        departmentFilter: req.body.departmentFilter,
        officeFilter: req.body.officeFilter,
        skillFilter: req.body.skillFilter,
        neverMatchedFilter: req.body.neverMatchedFilter,
      };
      if (!(await isReqBodyValueCorrect(reqBody, res))) {
        return;
      }

      const matchGroupDetail = await createMatchGroup(reqBody);
      if (!matchGroupDetail) {
        res.status(500).json({
          message: "マッチグループの作成に失敗しました。",
        });
        console.error("failed to create a new match group");
        return;
      }
      res.status(201).json(matchGroupDetail);
    } catch (e) {
      next(e);
    }
  }
);

const isReqBodyTypeCorrect = (
  req: express.Request,
  res: express.Response
): boolean => {
  if (
    req.body.matchGroupName === undefined ||
    typeof req.body.matchGroupName !== "string"
  ) {
    res.status(400).json({
      message: "マッチグループ名を文字列で指定してください。",
    });
    console.warn("matchGroupName is not specified or not string");
    return false;
  }
  if (
    req.body.description === undefined ||
    typeof req.body.description !== "string"
  ) {
    res.status(400).json({
      message: "マッチグループの説明を文字列で指定してください。",
    });
    console.warn("description is not specified or not string");
    return false;
  }
  if (
    req.body.numOfMembers === undefined ||
    typeof req.body.numOfMembers !== "number"
  ) {
    res.status(400).json({
      message: "作成したいマッチグループの人数を数値で指定してください。",
    });
    console.warn("numOfMembers is not specified or not number");
    return false;
  }
  if (
    req.body.departmentFilter === undefined ||
    typeof req.body.departmentFilter !== "string"
  ) {
    res.status(400).json({
      message: "マッチグループの部署フィルタを文字列で指定してください。",
    });
    console.warn("departmentFilter is not specified or not string");
    return false;
  }
  if (
    req.body.officeFilter === undefined ||
    typeof req.body.officeFilter !== "string"
  ) {
    res.status(400).json({
      message: "マッチグループのオフィスフィルタを文字列で指定してください。",
    });
    console.warn("officeFilter is not specified or not string");
    return false;
  }
  if (
    req.body.skillFilter === undefined ||
    !(
      Array.isArray(req.body.skillFilter) &&
      req.body.skillFilter.every((f: any) => typeof f === "string")
    )
  ) {
    res.status(400).json({
      message:
        "マッチグループのスキルフィルタを文字列の配列で指定してください。",
    });
    console.warn("skillFilter is not specified or not array");
    return false;
  }
  if (
    req.body.neverMatchedFilter === undefined ||
    typeof req.body.neverMatchedFilter !== "boolean"
  ) {
    res.status(400).json({
      message:
        "マッチグループのneverMatchedフィルタを真偽値で指定してください。",
    });
    console.warn("neverMatchedFilter is not specified or not boolean");
    return false;
  }

  return true;
};

const isReqBodyValueCorrect = async (
  reqBody: MatchGroupConfig,
  res: express.Response
) => {
  if (reqBody.matchGroupName.length < 1 || 50 < reqBody.matchGroupName.length) {
    res.status(400).json({
      message: "マッチグループ名は1文字以上50文字以下で指定してください。",
    });
    console.warn("matchGroupName mush be 1 to 50 characters");
    return false;
  }
  if (120 < reqBody.description.length) {
    res.status(400).json({
      message: "マッチグループの説明は120文字以下で指定してください。",
    });
    console.warn("description must be less than 120 characters");
    return false;
  }
  if (reqBody.numOfMembers < 2 || 8 < reqBody.numOfMembers) {
    res.status(400).json({
      message:
        "作成したいマッチグループの人数は2人以上8人以下で指定してください。",
    });
    console.warn("numOfMembers must be 2 to 8");
    return false;
  }
  switch (reqBody.departmentFilter) {
    case "onlyMyDepartment":
      break;
    case "excludeMyDepartment":
      break;
    case "none":
      break;
    default:
      res.status(400).json({
        message: `マッチグループの部署フィルタは'onlyMyDepartment', 'excludeMyDepartment', 'none'のいずれかで指定してください。`,
      });
      console.warn(
        `departmentFilter must be "onlyMyDepartment", "excludeMyDepartment" or "none"`
      );
      return false;
  }
  switch (reqBody.officeFilter) {
    case "onlyMyOffice":
      break;
    case "excludeMyOffice":
      break;
    case "none":
      break;
    default:
      res.status(400).json({
        message: `マッチグループのオフィスフィルタは'onlyMyOffice', 'excludeMyOffice', 'none'のいずれかで指定してください。`,
      });
      console.warn(
        `officeFilter must be "onlyMyOffice", "excludeMyOffice" or "none"`
      );
      return false;
  }
  if (reqBody.skillFilter.some((skill) => skill === "")) {
    res.status(400).json({
      message: "マッチグループのスキルフィルタに空文字が含まれています。",
    });
  }
  const noExistSkill = await checkSkillsRegistered(reqBody.skillFilter);
  if (noExistSkill !== undefined) {
    res.status(400).json({
      message: `${noExistSkill}はスキルとして登録されていません。`,
    });
    console.warn(`skill must be registered in skill table`);
    return false;
  }

  return true;
};

// マッチグループ取得API
matchGroupRouter.get(
  "/members/:userId",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const userId: string = req.params.userId;

    try {
      const user = await getUserByUserId(userId);
      if (!user) {
        res.status(404).json({
          message: "指定されたユーザーは存在しません。",
        });
        console.warn("specified user not exist");
        return;
      }
      const status = req.query.status === "open" ? "open" : "all";
      let limit = Math.trunc(Number(req.query.limit));
      if (Number.isNaN(limit) || limit < 0 || 100 < limit) {
        limit = 20;
      }

      let offset = Math.trunc(Number(req.query.offset));
      if (Number.isNaN(offset) || offset < 0) {
        offset = 0;
      }

      const matchGroupIds = await getMatchGroupIdsByUserId(user.userId);
      if (matchGroupIds.length === 0) {
        res.json([]);
        return;
      }

      const matchGroups = await getMatchGroupsByMatchGroupIds(
        matchGroupIds,
        status
      );
      if (matchGroups.length === 0) {
        res.json([]);
        return;
      }

      // ステータスの降順 (openが先)・作成日の降順・マッチグループ名の昇順でソート
      matchGroups.sort((a, b) => {
        if (a.status === "open" && b.status === "close") return -1;
        if (a.status === "close" && b.status === "open") return 1;
        if (new Date(a.createdAt) > new Date(b.createdAt)) return -1;
        if (new Date(a.createdAt) < new Date(b.createdAt)) return 1;
        if (a.matchGroupName < b.matchGroupName) return -1;
        if (a.matchGroupName > b.matchGroupName) return 1;
        return 0;
      });

      res.json(matchGroups.slice(offset, offset + limit));
    } catch (e) {
      next(e);
    }
  }
);
