# cocli
CLI tools collection for Clash of Code

# Usage

## Config
Put your Codingamer User ID and Auth Cookie in the
`~/.cocli/config.json` file in following format:
```json
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
Joins a clash by the url.

After joining, the command waits
until the clash starts, prints
out the statement and then waits
until the clash is finished.

Information while waiting to start:
```
Owner: boolean if you are owner of this clash
Players: the amount of players in the lobby
Start: time until the clash starts
```

Information while waiting to finish:
```
Submission: your current submission if it exists
Finish: time until the clash finishes
Report: link to view the report of the clash in your browser
```

### Start
```
cocli start
```
Force start the clash if you are the owner.

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
