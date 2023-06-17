import { check } from "k6";
import http from "k6/http";
import { Options } from "k6/options";
import exec from "k6/execution";

// baseUrl
const BASE_URL = __ENV.BASE_URL;

// ユーザー数
const USER_NUM = 300000;

const url = (path: string) => `${BASE_URL}${path}`;

export const options: Options = {
  scenarios: {
    // ログインAPIのシナリオ
    postSessionScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "postSessionAPI",
    },

    // ユーザーアイコン画像取得APIのシナリオ
    getUserIconScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "getUserIconAPI",
    },

    // ユーザー一覧取得APIのシナリオ
    getUsersScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "getUsersAPI",
    },

    // ユーザー検索APIのシナリオ
    searchUsersScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "searchUsersAPI",
    },

    // マッチグループ作成APIのシナリオ
    createMatchGroupsScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "createMatchGroupsAPI",
    },

    // マッチグループ一覧取得APIのシナリオ
    getMatchGroupsScenario: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 40 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 120 },
        { duration: "10s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "1m",
      gracefulStop: "1m",
      exec: "getMatchGroupsAPI",
    },
  },
};

export const postSessionAPI = () => {
  const index =
    exec.scenario.iterationInInstance < USER_NUM
      ? exec.scenario.iterationInInstance
      : exec.scenario.iterationInInstance - USER_NUM;

  const res = http.post(
    url("/api/v1/session"),
    JSON.stringify({
      mail: `popy${index}@example.com`,
      password: `pass${index}`,
    }),
    { headers: { "Content-Type": "application/json" }, timeout: "50s" }
  );
  check(res, {
    "Login: is status 200 or 201": () =>
      res.status === 200 || res.status === 201,
  });
};

export const getUserIconAPI = () => {
  const res = http.get(url(`/api/v1/users/user-icon/test-file-id`), {
    cookies: {
      SESSION_ID: "test-session-id",
    },
    timeout: "50s",
  });
  check(res, {
    "Get user icon: is status 200": () => res.status === 200,
  });
};

export const getUsersAPI = () => {
  const res = http.get(url(`/api/v1/users`), {
    cookies: {
      SESSION_ID: "test-session-id",
    },
    timeout: "50s",
  });
  check(res, {
    "Get users: is status 200": () => res.status === 200,
  });
};

export const searchUsersAPI = () => {
  // 検索キーワードは"常務"
  const res = http.get(url(`/api/v1/users/search?q=%E5%B8%B8%E5%8B%99`), {
    cookies: {
      SESSION_ID: "test-session-id",
    },
    timeout: "50s",
  });
  check(res, {
    "Get users: is status 200": () => res.status === 200,
  });
};

export const createMatchGroupsAPI = () => {
  const res = http.post(
    url("/api/v1/match-groups"),
    JSON.stringify({
      matchGroupName: "match-group",
      description: "match-group description",
      numOfMembers: 4,
      departmentFilter: "onlyMyDepartment",
      officeFilter: "onlyMyOffice",
      skillFilter: ["簿記3級"],
      neverMatchedFilter: true,
    }),
    {
      cookies: { SESSION_ID: "test-session-id" },
      headers: { "Content-Type": "application/json" },
      timeout: "50s",
    }
  );
  check(res, {
    "Create match-groups: is status 201": () => res.status === 201,
  });
};

export const getMatchGroupsAPI = () => {
  const res = http.get(
    url(`/api/v1/match-groups/members/692ee607-9cdf-439b-8b06-1a435c99aa5a?status=open`),
    {
      cookies: {
        SESSION_ID: "test-session-id",
      },
      timeout: "50s",
    }
  );
  check(res, {
    "Get match-groups: is status 200": () => res.status === 200,
  });
};
