const { saveFile, deleteFile } = require('./fileService');

// S3 Service with local disk storage fallback
exports.uploadToS3 = async (file, folder = 'issues') => {
  try {
    // If local file service is used as fallback
    const result = saveFile(file);
    return {
      url: result.url,
      key: result.filename
    };
  } catch (error) {
    console.error('Error in uploadToS3 service:', error);
    throw error;
  }
};

exports.deleteFromS3 = async (key) => {
  try {
    return deleteFile(key);
  } catch (error) {
    console.error('Error in deleteFromS3 service:', error);
    return false;
  }
};
