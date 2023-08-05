const fs = require('fs');
const path = require('path');

function deletePuppeteerFolders() {
  // Get the path to the %TEMP% directory
  const tempDir = process.env.TEMP;

  // Read the contents of the %TEMP% directory
  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('Error reading TEMP directory:', err);
      return;
    }

    // Iterate through the files/folders in the %TEMP% directory
    files.forEach(file => {
      const fullPath = path.join(tempDir, file);

      // Check if the file/folder name starts with "puppeteer_dev_profile-"
      if (file.startsWith('puppeteer_dev_profile-')) {
        
        // Check if it's a directory
        if (fs.statSync(fullPath).isDirectory()) {
          // If so, try to delete the folder recursively
          fs.rm(fullPath, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error('Error deleting folder:', fullPath, err);
            } else {
              console.log('Successfully deleted folder:', fullPath);
            }
          });
        }
      }
    });
  });
}

// Usage
deletePuppeteerFolders();
