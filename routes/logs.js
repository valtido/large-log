var express = require("express");
var fs = require("fs");
var path = require("path");
var router = express.Router();
const readline = require("readline");
const logReg = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}),994\s(INFO|ERROR|WARNING)\s(.*)$/;
// assuming that the file is static,
// I will log some statistical information for the file.
// to help improve the speed of fetching the file in the future.
const logfile = "../logs/log.txt";
let lineStats = [];

function getLogStats(file) {
  let lineNumber = 0;
  const filename = path.resolve(__dirname, file);

  const stream = readline.createInterface({
    input: fs.createReadStream(filename),
    crlfDelay: Infinity
  });

  stream.on("line", (line) => {
    //lines are split by end of line so we need to add the difference
    lineStats[lineNumber] = line.length + 2;
    lineNumber++;
  });
}

// call once, when server is first up and running.
getLogStats(logfile);

function getLog(res, file, from, to) {
  const filename = path.resolve(__dirname, file);
  let output = [];
  let start = 0;
  let end = 0;
  let i;
  // finds which part of the file we should query
  // convert from line number to Nth character in the file
  for (i = 0; i < lineStats.length; i++) {
    if (i < from) {
      start += lineStats[i];
    }
    if (i <= to) {
      end += lineStats[i];
    }
  }

  // read partial of file not the whole file at once
  const stream = readline.createInterface({
    input: fs.createReadStream(filename, { start, end }),
    crlfDelay: Infinity
  });

  stream.on("line", (line) => {
    output.push(line);
  });

  stream.on("close", () => {
    res.json({ lines: output });
  });
}
/* 
GET logs listing. 
@query start Number Line number to read from
@query end Number Line number to read up to,
*/
router.get("/", function (req, res, next) {
  const { start, end } = req.query;
  if (!start || !end) {
    res.status(500);
    res.end();
    return false;
  }
  getLog(res, logfile, start, Math.min(end, lineStats.length));
});

module.exports = router;
