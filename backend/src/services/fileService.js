// backend/src/services/fileService.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const saveFile = (file) => {
  const filename = `${uuidv4()}-${file.originalname}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  fs.writeFileSync(filepath, file.buffer);
  
  // Return URL for frontend access
  const url = `/uploads/${filename}`;
  return { url, filename, filepath };
};

const deleteFile = (filename) => {
  const filepath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
};

module.exports = { saveFile, deleteFile };