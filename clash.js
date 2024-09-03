const axios = require("axios");
const fs = require("fs");
const he = require("he");

const dir = process.env.HOME + "/.cocli";
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const { userId, rememberMe } = JSON.parse(fs.readFileSync(dir + "/config.json"));

async function api(path, body) {
  const r = await axios.post(
    "https://www.codingame.com/services" + path,
    body,
    {
      "headers": {
        "Cookie": "rememberMe=" + rememberMe,
        "Content-Type": "application/json;charset=utf-8"
      }
    }
  );
  return r.data;
}

async function static(id) {
  const r = await axios.get(
    "https://static.codingame.com/servlet/fileservlet?id=" + id,
    {
      "headers": {
        "Cookie": "rememberMe=" + rememberMe
      }
    }
  );
  return r.data;
}

const langs = {
  "c": "C", "cpp": "C++", "d": "D",
  "go": "Go", "ml": "OCaml", "rs": "Rust",
  "swift": "Swift", "ts": "TypeScript",
  "kt": "Kotlin", "java": "Java",
  "groovy": "Groovy", "scala": "Scala",
  "sh": "Bash", "clj": "Clojure",
  "dart": "Dart", "fs": "F#",
  "hs": "Haskell", "js": "Javascript",
  "lua": "Lua", "m": "ObjectiveC",
  "pas": "Pascal", "pl": "Perl",
  "php": "PHP", "py": "Python3",
  "rb": "Ruby", "vb": "VB.NET"
};

function prettyHTML(html) {
  let r = he.unescape(html);
  r = r.replace(/<br ?\/?>/g, "\n");
  r = r.replace(/<var>(.*?)<\/var>/g, "\x1b[33m[$1]\x1b[0m");
  r = r.replace(/<const>(.*?)<\/const>/g, "\x1b[34m[$1]\x1b[0m");
  r = r.replace(/<strong>(.*?)<\/strong>/g, "\x1b[1m$1\x1b[0m");
  r = r.replace(/<(.*?)>(.*?)<\/\1>/g, "$2");
  return r;
}

(async () => {

  const mode = process.argv[2] ?? "status";
  const arg = process.argv[3] ?? null;

  if (mode == "status") {

    let user;
    try {
      user = await api("/Leaderboards/getCodinGamerClashRanking", [userId, "global", null]);
    } catch (error) {
      console.log("Error");
      return;
    }
    console.log("Nickname:     ", user.pseudo);
    console.log("Rank:         ", user.rank, "/", user.total);
    console.log("Ranked played:", user.clashesCount);

  } else if (mode == "join") {
    let join = arg ? arg.split("/").slice(-1)[0] : null;
    let clash;
    if (join == null) {
      console.log("Playing...");
      clash = await api("/ClashOfCode/playClash", [userId, null]);
    } else {
      console.log("Joining...");
      clash = await api("/ClashOfCode/joinClashByHandle", [userId, join, null]);
    }
    const handle = clash.publicHandle;
    console.log("Waiting to start...");

    fs.writeFileSync(dir + "/current.json", JSON.stringify({ handle }));

    console.log("");
    let was = false;
    while (true) {
      clash = await api("/ClashOfCode/findClashByHandle", [handle]);

      // jump to beginning and clear
      if (was) process.stdout.write("\x1b[3F\x1b[J");
      was = true;

      const me = clash.players.find(p => p.codingamerId == userId);
      const owner = me.status == "OWNER";

      let delta = clash.startTimestamp - Date.now();
      const neg = (delta < 0);
      if (neg) delta = - delta;
      const sec = (parseInt(delta / 1000) % 60).toString().padStart(2, "0");
      const min = parseInt(delta / 60000);

      console.log("Owner:  ", owner);
      console.log("Players:", clash.players.length);
      console.log("Start:  ", min + ":" + sec + (neg ? " ago" : ""));

      if (clash.started) break;
      await new Promise(r => setTimeout(r, 2000));
    }
    const mode = (
      clash.mode.slice(0, 1).toUpperCase() +
      clash.mode.slice(1).toLowerCase()
    );
    const langs = clash.programmingLanguages.length ?
      clash.programmingLanguages.join(", ") : "All";

    console.log("");
    console.log("Mode:     ", mode);
    console.log("Languages:", langs);
    console.log("");

    const session = await api("/ClashOfCode/startClashTestSession", [userId, handle]);
    const test = session.handle;

    const task = await api("/TestSession/startTestSession", [test]);
    const ques = task.currentQuestion.question;

    const lines = [];
    if (mode != "Reverse") {
      const s = ques.statement;

      const goal = s.matchAll(/<span class="question-statement">(.*?)<\/span>/sg).toArray()[0][1];
      lines.push("## Goal", prettyHTML(goal), "");

      const inp = s.matchAll(/<div class="question-statement-input">(.*?)<\/div>/sg).toArray()[0][1];
      lines.push("## Input Format", prettyHTML(inp), "");
      const out = s.matchAll(/<div class="question-statement-output">(.*?)<\/div>/sg).toArray()[0][1];
      lines.push("## Output Format", prettyHTML(out), "");
      const con = s.matchAll(/<div class="question-statement-constraints">(.*?)<\/div>/sg).toArray()[0][1];
      lines.push("## Constraints", prettyHTML(con), "");

      console.log(lines.join("\n").trim());
    }

    const tests = [];
    const testLines = [];
    for (const testCase of ques.testCases) {
      testLines.push(
        "Case #" + testCase.index + (testCase.label ? " (" + testCase.label + ")" : ""),
        "## Input:",
        await static(testCase.inputBinaryId),
        "## Output:",
        await static(testCase.outputBinaryId),
        ""
      );
      tests.push(testCase.index);
    }
    const testCases = testLines.join("\n").trim();
    if (mode == "Reverse") console.log(testCases);

    fs.writeFileSync(dir + "/current.json", JSON.stringify({ handle, test, tests, testCases }));

    console.log("");
    was = false;
    while (true) {
      clash = await api("/ClashOfCode/findClashByHandle", [handle]);

      // jump to beginning and clear
      if (was) process.stdout.write("\x1b[3F\x1b[J");
      was = true;

      const me = clash.players.find(p => p.codingamerId == userId);
      const sub = me.score ? ("Score - " + me.score + "%, place - " + me.rank) : "None yet";

      let delta = clash.msBeforeEnd;
      const neg = (delta < 0);
      if (neg) delta = - delta;
      const sec = (parseInt(delta / 1000) % 60).toString().padStart(2, "0");
      const min = parseInt(delta / 60000);

      console.log("Submission:", sub);
      console.log("Finish:    ", min + ":" + sec + (neg ? " ago" : ""));
      console.log("Report:    ", "codingame.com/clashofcode/clash/report/" + handle);

      if (clash.finished) break;
      await new Promise(r => setTimeout(r, 10000));
    }

  } else if (mode == "start") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    await api("/ClashOfCode/startClashByHandle", [userId, handle]);

  } else if (mode == "submit") {
    const { handle, test, tests } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    const ext = arg.split(".").slice(-1)[0];
    const lang = langs[ext];
    const code = fs.readFileSync(arg, "UTF-8").trim();
    await api("/TestSession/submit", [
      test, { code, "programmingLanguageId": lang }, null
    ]);
    await api("/ClashOfCode/shareCodinGamerSolutionByHandle", [userId, handle]);

  } else if (mode == "test") {
    const { test, tests } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    const ext = arg.split(".").slice(-1)[0];
    const lang = langs[ext];
    const code = fs.readFileSync(arg, "UTF-8").trim();
    for (const testIndex of tests) {
      const result = await api("/TestSession/play", [
        test, {
          code, "multipleLanguages": { testIndex },
          "programmingLanguageId": lang
        }
      ]);
      if (result.comparison.success) {
        console.log("Test #" + testIndex + ":", "\x1b[32mPass\x1b[0m");
      } else {
        console.log("Test #" + testIndex + ":", "\x1b[31mFail\x1b[0m");
        console.log("Output:");
        console.log(result.output);
        console.log("");
        console.log("Expected:", "^" + result.comparison.expected + "$");
        console.log("Found:   ", "^" + result.comparison.found + "$");
        break;
      }
    }

  } else if (mode == "cases") {
    const { testCases } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    console.log(testCases);

  } else {
    console.error("Wrong mode selected");
  }

})();
