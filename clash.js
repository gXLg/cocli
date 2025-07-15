const axios = require("axios");
const fs = require("fs");

const dir = process.env.HOME + "/.cocli";
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const { userId, rememberMe } = JSON.parse(fs.readFileSync(dir + "/config.json"));

async function api(path, body) {
  try {
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
  } catch (error) {
    const r = error.response?.data;
    if (r?.code == "CLASH-CAPTCHA") {
      console.log("Captcha required: https://www.codingame.com/clashofcode/captcha");
      process.exit(1);
    }
    throw error;
  }
}

async function static(id) {
  const r = await axios.get(
    "https://static.codingame.com/servlet/fileservlet?id=" + id,
    {
      "headers": {
        "Cookie": "rememberMe=" + rememberMe
      },
      "responseType": "text"
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
    const cheerio = require("cheerio");

    let join = arg ? arg.split("/").slice(-1)[0] : null;
    let clash;
    if (join == null) {
      console.log("Playing...");
      clash = await api("/ClashOfCode/playClash", [userId, null]);
    } else {
      console.log("Joining...");
      try {
        clash = await api("/ClashOfCode/joinClashByHandle", [userId, join, null]);
      } catch (error) {
        console.log(error);
        clash = await api("/ClashOfCode/findClashByHandle", [join]);
      }
    }
    const handle = clash.publicHandle;
    console.log("Clash handle:", handle);
    console.log("Waiting to start...");

    fs.writeFileSync(dir + "/current.json", JSON.stringify({ handle }));

    console.log("");
    let was = false;
    while (true) {
      clash = await api("/ClashOfCode/findClashByHandle", [handle]);

      const me = clash.players.find(p => p.codingamerId == userId);
      const state = me ? (
        me.status.slice(0, 1).toUpperCase() +
        me.status.slice(1).toLowerCase()
      ) : "Left";

      let delta = clash.startTimestamp - Date.now();
      const neg = (delta < 0);
      if (neg) delta = - delta;
      const sec = (parseInt(delta / 1000) % 60).toString().padStart(2, "0");
      const min = parseInt(delta / 60000);

      // jump to beginning and clear
      if (was) process.stdout.write("\x1b[3F\x1b[J");
      was = true;

      console.log("State:  ", state);
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
    console.log("Mode: ", mode);
    console.log("Langs:", langs);
    console.log("");

    const me = clash.players.find(p => p.codingamerId == userId);
    if (me == null) {
      console.log("You left the clash!");
      return;
    }

    const session = await api("/ClashOfCode/startClashTestSession", [userId, handle]);
    const test = session.handle;

    const task = await api("/TestSession/startTestSession", [test]);
    const ques = task.currentQuestion.question;

    const lines = [];
    if (mode != "Reverse") {
      const s = ques.statement;

      try {
        const html = cheerio.load(s);

        html("br").after("<span>\n<span>");
        html("var,.var").text((_, t) => "\x1b[33m[" + t + "]\x1b[0m");
        html("const,code,.const").text((_, t) => "\x1b[94m[" + t + "]\x1b[0m");
        html("b,strong").text((_, t) => "\x1b[1m[" + t + "]\x1b[0m");

        const goal = html(".question-statement").text();
        lines.push("## Goal", goal, "");

        const inp = html(".question-statement-input").text();
        lines.push("## Input Format", inp, "");
        const out = html(".question-statement-output").text();
        lines.push("## Output Format", out, "");
        const con = html(".question-statement-constraints").text() ?? "None";
        lines.push("## Constraints", con, "");

        console.log(lines.join("\n").trim());
      } catch (error) {
        console.log(s);
      }
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

      const me = clash.players.find(p => p.codingamerId == userId);
      const sub = me.score ? ("Score - " + me.score + "%, place - " + me.rank) : "No submission";

      let delta = clash.msBeforeEnd;
      const neg = (delta < 0);
      if (neg) delta = - delta;
      const sec = (parseInt(delta / 1000) % 60).toString().padStart(2, "0");
      const min = parseInt(delta / 60000);

      // jump to beginning and clear
      if (was) process.stdout.write("\x1b[3F\x1b[J");
      was = true;

      console.log("You: ", sub);
      console.log("End: ", min + ":" + sec + (neg ? " ago" : ""));
      console.log("Info:", "https://www.codingame.com/clashofcode/clash/report/" + handle);

      if (clash.finished) break;
      await new Promise(r => setTimeout(r, 10000));
    }

  } else if (mode == "info") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    const clash = await api("/ClashOfCode/findClashByHandle", [handle]);
    const search = arg?.toLowerCase() ?? "";
    const player = clash.players.find(p => p.codingamerNickname.toLowerCase().includes(search));
    if (player == null) {
      console.log("Player was not found");
      return;
    }

    const cr = await api("/ClashOfCode/getClashRankByCodinGamerId", [player.codingamerId]);
    const info = await api("/CodinGamer/findCodingamePointsStatsByHandle", [player.codingamerHandle]);

    const { pseudo, countryId, tagline, biography } = info.codingamer;
    const { rank } = cr ?? {};

    console.log(pseudo, countryId, "#" + (rank ?? "?"));
    if (tagline) console.log(tagline);
    if (biography) console.log("");
    for (const l of biography?.split("\n") ?? []) {
      console.log("|", l);
    }


  } else if (mode == "board") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    const clash = await api("/ClashOfCode/findClashByHandle", [handle]);

    const working = clash.players.filter(p => p.score == null);
    const ready = clash.players.filter(p => p.score != null)
      .sort((a, b) => (a.rank != b.rank) ? (a.rank - b.rank) : (a.duration - b.duration));

    for (const p of ready) {
      const rank = p.rank.toString().padStart(3, " ");
      const score = (p.score + "%").padStart(4, " ");

      const t = parseInt(p.duration / 1000);
      const m = parseInt(t / 60);
      const s = (t % 60).toString().padStart(2, "0");
      const time = (m + ":" + s).padStart(5, " ")

      const nick = p.codingamerNickname;
      const lang = (p.languageId ?? "N/A").padEnd(11, " ");
      const crit = (p.criterion ?? "N/A").toString().padEnd(4, " ");

      console.log(rank, time, score, crit, lang, nick);
    }

    for (const p of working) {
      const nick = p.codingamerNickname;
      console.log("???", nick);
    }

  } else if (mode == "start") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    await api("/ClashOfCode/startClashByHandle", [userId, handle]);

  } else if (mode == "leave") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    await api("/ClashOfCode/leaveClashByHandle", [userId, handle]);

  } else if (mode == "rejoin") {
    const { handle } = JSON.parse(fs.readFileSync(dir + "/current.json"));
    await api("/ClashOfCode/joinClashByHandle", [userId, handle, null]);

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
      if (result.error && !result.comparison) {
        console.log("Test #" + testIndex + ":", "\x1b[31mFail\x1b[0m");
        console.log("Error:", result.error.message);
        break;
      } else if (result.comparison.success) {
        console.log("Test #" + testIndex + ":", "\x1b[32mPass\x1b[0m");
        if (result.error) console.log("Error:", result.error.message);
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
