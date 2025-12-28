#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

class Core4TrackerTTY {
  constructor() {
    this.dataDir = path.join(os.homedir(), ".local", "share", "alphaos");
    this.dropDir = path.join(this.dataDir, "drop");
    this.dataFile = path.join(this.dataDir, "data", "core_log.csv");
    this.todayFile = path.join(this.dropDir, "core4_today.json");

    this.ensureDirectories();
    this.initializeFiles();

    this.taskwarriorEnabled = process.env.CORE4_TW_SYNC !== "0";
    this.taskwarriorAvailable = this.taskwarriorEnabled && this.checkTaskwarrior();
  }

  ensureDirectories() {
    const dirs = [this.dataDir, this.dropDir, path.join(this.dataDir, "data")];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeFiles() {
    if (!fs.existsSync(this.dataFile)) {
      const header =
        "date,fitness,fuel,meditation,memoirs,partner,posterity,discover,declare,total\n";
      fs.writeFileSync(this.dataFile, header);
    }

    const today = this.getTodayString();
    let todayData = this.getTodayData();

        if (!todayData || todayData.date !== today) {
            todayData = {
                date: today,
                fitness: 0,
                fuel: 0,
                meditation: 0,
                memoirs: 0,
                partner: 0,
                posterity: 0,
                discover: 0,
                declare: 0,
                csv_written: false,
            };
            this.saveTodayData(todayData);
        }
  }

  getTodayString() {
    return new Date().toISOString().split("T")[0];
  }

  getTodayData() {
    try {
      if (fs.existsSync(this.todayFile)) {
        return JSON.parse(fs.readFileSync(this.todayFile, "utf8"));
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  saveTodayData(data) {
    try {
      fs.writeFileSync(this.todayFile, JSON.stringify(data, null, 2));
    } catch (error) {
      return;
    }
  }

  updateSubtask(subtask, value) {
    const todayData = this.getTodayData();
    if (todayData) {
      todayData[subtask] = value;
      this.saveTodayData(todayData);
      this.syncTaskwarrior(subtask, value, todayData.date);
      this.updateCSVIfComplete(todayData);
      return todayData;
    }
    return null;
  }

  updateCSVIfComplete(todayData) {
    if (todayData.csv_written) return;
    const totalRaw = Object.keys(todayData)
      .filter((key) => !["date", "csv_written"].includes(key))
      .reduce((sum, key) => sum + todayData[key], 0);
    const total = totalRaw * 0.5;

    if (total >= 4.0 || this.shouldWriteCSV()) {
      this.writeToCSV(todayData, total);
    }
  }

  shouldWriteCSV() {
    return new Date().getHours() >= 22;
  }

  writeToCSV(todayData, total) {
    if (todayData.csv_written) return;
    try {
      const csvLine = `${todayData.date},${todayData.fitness * 0.5},${todayData.fuel * 0.5},${todayData.meditation * 0.5},${todayData.memoirs * 0.5},${todayData.partner * 0.5},${todayData.posterity * 0.5},${todayData.discover * 0.5},${todayData.declare * 0.5},${total.toFixed(
        1
      )}\n`;
      fs.appendFileSync(this.dataFile, csvLine);
      todayData.csv_written = true;
      this.saveTodayData(todayData);
    } catch (error) {
      return;
    }
  }

  getDailyTotal() {
    const todayData = this.getTodayData();
    if (!todayData) return 0;
    const raw = Object.keys(todayData)
      .filter((key) => !["date", "csv_written"].includes(key))
      .reduce((sum, key) => sum + todayData[key], 0);
    return raw * 0.5;
  }

  startTTYMode() {
    if (!process.stdout.isTTY) {
      console.error("Core4 TTY requires a TTY.");
      process.exit(1);
    }

    const todayData = this.getTodayData();
    if (!todayData) return;

    const total = this.getDailyTotal();

    console.clear();
    console.log("ALPHA OS - CORE4 TRACKER SYSTEM (V2)");
    console.log('"Hit your Four before the Door to prepare for War."');
    console.log("");
    console.log(`${todayData.date} | Current: ${total.toFixed(1)}/4.0 points`);
    console.log("");

    if (total >= 4.0) {
      console.log("CORE4 COMPLETE. You are ready for war.");
      console.log("Press any key to exit...");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", () => process.exit(0));
      return;
    }

    this.renderInterface(todayData);
  }

  renderInterface(todayData) {
    const domains = [
      { name: "BODY", subtasks: ["fitness", "fuel"] },
      { name: "BEING", subtasks: ["meditation", "memoirs"] },
      { name: "BALANCE", subtasks: ["partner", "posterity"] },
      { name: "BUSINESS", subtasks: ["discover", "declare"] },
    ];

    domains.forEach((domain, index) => {
      const domainTotal = domain.subtasks.reduce(
        (sum, subtask) => sum + todayData[subtask] * 0.5,
        0
      );
      const status =
        domainTotal >= 1.0 ? "OK" : domainTotal >= 0.5 ? "HALF" : "NO";

      console.log(
        `${index + 1}. [${status}] ${domain.name} (${domainTotal.toFixed(
          1
        )}/1.0)`
      );
      domain.subtasks.forEach((subtask, subIndex) => {
        const value = todayData[subtask];
        const statusIcon = value >= 1 ? "X" : "O";
        const keyNum = index * 2 + subIndex + 1;
        console.log(`   [${keyNum}] ${statusIcon} ${subtask}: ${value}`);
      });
      console.log("");
    });

    console.log("Commands: [1-8] toggle subtask, [q] quit");
    process.stdout.write("Enter command: ");

    this.handleInput(todayData);
  }

  handleInput(todayData) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.removeAllListeners("data");

    process.stdin.on("data", (key) => {
      if (key === "q" || key === "\u0003") {
        process.exit(0);
      } else if (key >= "1" && key <= "8") {
        const subtasks = [
          "fitness",
          "fuel",
          "meditation",
          "memoirs",
          "partner",
          "posterity",
          "discover",
          "declare",
        ];
        const subtaskIndex = Number.parseInt(key, 10) - 1;
        const subtask = subtasks[subtaskIndex];

        if (subtask) {
          const newValue = todayData[subtask] >= 1 ? 0 : 1;
          this.updateSubtask(subtask, newValue);
          console.clear();
          this.startTTYMode();
        }
      }
    });
  }

  checkTaskwarrior() {
    try {
      execFileSync("task", ["--version"], { stdio: "ignore" });
      return true;
    } catch (_) {
      return false;
    }
  }

  core4DateTag(dateStr) {
    return `core4_${dateStr.replace(/-/g, "")}`;
  }

  subtaskMeta(subtask) {
    const map = {
      fitness: { domain: "BODY", label: "fitness" },
      fuel: { domain: "BODY", label: "fuel" },
      meditation: { domain: "BEING", label: "meditation" },
      memoirs: { domain: "BEING", label: "memoirs" },
      partner: { domain: "BALANCE", label: "partner" },
      posterity: { domain: "BALANCE", label: "posterity" },
      discover: { domain: "BUSINESS", label: "discover" },
      declare: { domain: "BUSINESS", label: "declare" },
    };
    return map[subtask];
  }

  findTaskwarriorTask(tags) {
    const args = ["rc.verbose=0", "rc.confirmation=no", "+core4"];
    tags.forEach((tag) => args.push(`+${tag}`));
    args.push("status:pending,completed");
    args.push("export");
    try {
      const out = execFileSync("task", args, { encoding: "utf8" }).trim();
      if (!out) return null;
      const list = JSON.parse(out);
      if (!Array.isArray(list) || list.length === 0) return null;
      list.sort((a, b) => {
        const am = Date.parse(a.modified || a.entry || 0);
        const bm = Date.parse(b.modified || b.entry || 0);
        return bm - am;
      });
      return list[0];
    } catch (_) {
      return null;
    }
  }

  findTaskwarriorDueToday(tags) {
    const args = ["rc.verbose=0", "rc.confirmation=no", "+core4"];
    tags.forEach((tag) => args.push(`+${tag}`));
    args.push("due:today");
    args.push("status:pending");
    args.push("export");
    try {
      const out = execFileSync("task", args, { encoding: "utf8" }).trim();
      if (!out) return null;
      const list = JSON.parse(out);
      if (!Array.isArray(list) || list.length === 0) return null;
      return list[0];
    } catch (_) {
      return null;
    }
  }

  createTaskwarriorTask(meta, dateStr, tags) {
    const prompts = {
      fitness: "Did you sweat today?",
      fuel: "Did you fuel your body?",
      meditation: "Did you meditate?",
      memoirs: "Did you write memoirs?",
      partner: "Did you invest in your partner?",
      posterity: "Did you invest in posterity?",
      discover: "Did you discover?",
      declare: "Did you declare?",
    };
    const title = prompts[meta.label] || `Core4 ${meta.label}`;
    const args = [
      "add",
      title,
      "project:core4",
      "due:today",
      "rec:daily",
      "wait:+1d",
      "+core4",
      ...tags.map((tag) => `+${tag}`),
    ];
    try {
      execFileSync("task", args, { stdio: "ignore" });
      return true;
    } catch (_) {
      return false;
    }
  }

  markTaskwarriorDone(task) {
    if (!task?.uuid) return;
    try {
      execFileSync("task", [task.uuid, "done"], { stdio: "ignore" });
    } catch (_) {
      return;
    }
  }

  markTaskwarriorPending(task) {
    if (!task?.uuid) return;
    try {
      execFileSync("task", [task.uuid, "modify", "status:pending"], {
        stdio: "ignore",
      });
    } catch (_) {
      return;
    }
  }

  syncTaskwarrior(subtask, value, dateStr) {
    if (!this.taskwarriorAvailable) return;
    const meta = this.subtaskMeta(subtask);
    if (!meta) return;

    const tags = [meta.label];

    const task = this.findTaskwarriorTask(tags);
    if (value >= 1) {
      if (!task) {
        this.createTaskwarriorTask(meta, dateStr, tags);
      }
      const dueToday = this.findTaskwarriorDueToday(tags);
      if (dueToday) {
        this.markTaskwarriorDone(dueToday);
      }
      return;
    }

    // Recurring tasks should not be force-reset unless explicitly handled elsewhere.
  }
}

const tracker = new Core4TrackerTTY();
tracker.startTTYMode();
