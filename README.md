# cocli
CLI tools collection for Clash of Code

# Usage

## Install
Clone the repo, then run
```
npm install
```

## Config
Put your Codingamer User ID and Auth Cookie in the
`~/.cocli/config.json` file in following format:
```js
{
  "userId": number,
  "rememberMe": "string"
}
```

## CLI
For a simpler usage, clone the repository,
make sure the `cocli` file is executable
and add the repo to your `$PATH` variable.

## Commands

### Status
```
cocli status
```
Prints your Codingamer nickname and CoC ranking.

### Join
```
cocli join
```
Joins a public clash.

```
cocli join <url>
```
Joins a clash by the url and prints out its' handle.

After joining, the command waits
until the clash starts, prints
out the statement and then waits
until the clash is finished.
If the parser cannot process the
statement, raw HTML is printed out
as an emergency solution.

Information while waiting to start:
```
State:   "Owner", "Standard" or "Left" for states of your user in the clash
Players: the amount of players in the lobby
Start:   time until the clash starts
```

Information while waiting to finish:
```
You:  your current submission if it exists
End:  time until the clash finishes
Info: link to view the report of the clash in your browser
```

#### Captcha
When joining a public clash, you may sometimes be required
to solve a captcha. You have to make following steps:
1. You will be given a url, open it in your browser
2. Solve the captcha, you will be put into a public clash
3. Leave the clash before it starts
4. Continue clashing from the terminal

Usually one captcha solve is required every three games.
Currently I haven't found a way to prevent that.

### Leaderboard
```
cocli board
```
Prints out the leaderboard for current clash.

### Start
```
cocli start
```
Force start the clash if you are the owner.

### Leave
```
cocli leave
```
Leave the clash.

### Rejoin
```
cocli rejoin
```
Rejoin previously left clash.

### Test Cases
```
cocli cases
```
Print out the public test cases for current clash.

### Test
```
cocli test
```
Takes the last modified file in current directory and uses
it to run tests on the server.

### Submit
```
cocli submit
```
Takes the last modified file in current directory and uploads
it for submission.

### Player Information
```
cocli info <query>
```
Searches for a player in the current clash session
whose name contains the search query.
Then prints out information about them:
```
<nickname> <country> #<CoC rank>
<status>

| <bio>
```

# Personal Setup
Personally I use this tool to clash on the go from my phone.
I use the app Termux as a terminal emulator.
There I have 3 sessions:
* Status: `clear && cocli join`
* Editor: `nano file.py`
* Test: `cocli test`, `cocli board` or `cocli submit`

My current Clash of Code status:
```
Nickname:      _dev_null
Rank:          52 / 819111
Ranked played: 151
```
