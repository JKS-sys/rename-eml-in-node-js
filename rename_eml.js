const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const simpleParser = require("mailparser").simpleParser;

function sanitizeFilename(str) {
  if (!str) return "unknown";
  return str.replace(/[<>:"/\\|?*\n]/g, "_").substring(0, 50);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours} ${minutes} ${seconds}`;
}

const emlDir =
  "/Users/nome/Downloads/proton-mail-export-cli/Jagadeesh_2k17@proton.me/mail_20250914_114325"; // Change this to your EML directory

async function renameEmlFiles() {
  try {
    // Get all .eml files
    const emlFiles = await glob(`${emlDir}/*.eml`);

    for (const emlFile of emlFiles) {
      try {
        // Check if file is empty or too small
        const stats = fs.statSync(emlFile);
        if (stats.size < 10) {
          console.log(
            `Skipping potentially empty file: ${path.basename(emlFile)}`
          );
          continue;
        }

        const emlContent = fs.readFileSync(emlFile);

        // Check if file content is not empty
        if (!emlContent || emlContent.length === 0) {
          console.log(`Skipping empty file: ${path.basename(emlFile)}`);
          continue;
        }

        // Parse the email using mailparser
        const parsed = await simpleParser(emlContent);

        const from = parsed.from?.value[0]?.address || "unknown_sender";
        const to = parsed.to?.value[0]?.address || "unknown_recipient";
        const subject = parsed.subject || "no_subject";
        const date = parsed.date || new Date();

        const dateStr = formatDate(date);
        const timeStr = formatTime(date);
        const fromClean = sanitizeFilename(from);
        const toClean = sanitizeFilename(to);
        const subjectClean = sanitizeFilename(subject);

        // Generate base name for both EML and metadata files
        const baseName = `${dateStr} - ${timeStr} - ${fromClean} - ${toClean} - ${subjectClean}`;
        let newEmlName = `${baseName}.eml`;
        let newEmlPath = path.join(emlDir, newEmlName);
        let i = 1;

        // Handle duplicates
        while (fs.existsSync(newEmlPath)) {
          newEmlName = `${baseName}_${i}.eml`;
          newEmlPath = path.join(emlDir, newEmlName);
          i++;
        }

        // Rename EML file
        fs.renameSync(emlFile, newEmlPath);
        console.log(`Renamed ${path.basename(emlFile)} -> ${newEmlName}`);

        // Find and rename corresponding metadata file
        const emlBaseName = path.basename(emlFile, ".eml");
        const metadataFile = path.join(emlDir, `${emlBaseName}.metadata.json`);

        if (fs.existsSync(metadataFile)) {
          const newMetadataName = `${path.basename(
            newEmlPath,
            ".eml"
          )}.metadata.json`;
          const newMetadataPath = path.join(emlDir, newMetadataName);

          fs.renameSync(metadataFile, newMetadataPath);
          console.log(
            `Renamed metadata ${path.basename(
              metadataFile
            )} -> ${newMetadataName}`
          );
        }
      } catch (err) {
        console.error(
          `Error processing ${path.basename(emlFile)}:`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("Error fetching files:", err);
  }
}

// Install required packages: npm install mailparser glob
renameEmlFiles();
