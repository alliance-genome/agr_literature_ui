// created this module with help from various AIs
const JSZip = window.JSZip;
const pako = window.pako;

// Helper to read string from Uint8Array
const readString = (buffer, offset, length) => {
  const stringBytes = buffer.slice(offset, offset + length);
  const nullIndex = stringBytes.findIndex(byte => byte === 0);
  const validBytes = nullIndex >= 0 
    ? stringBytes.slice(0, nullIndex)
    : stringBytes;
  
  return new TextDecoder().decode(validBytes);
};

// TAR parser implementation with macOS/PaxHeader filtering
const parseTar = (arrayBuffer) => {
  const files = [];
  const buffer = new Uint8Array(arrayBuffer);
  let offset = 0;
  const blockSize = 512;

  while (offset < buffer.length) {
    const name = readString(buffer, offset, 100);
    if (!name) break;

    const size = parseInt(readString(buffer, offset + 124, 12), 8);
    offset += blockSize;

    // Skip macOS resource fork AND PaxHeader files
    if (name.startsWith('._') || 
        name.includes('/._') || 
        name.includes('PaxHeader/')) {  // Add PaxHeader filter
      // Skip this file
      offset += size;
      if (size % blockSize !== 0) {
        offset += blockSize - (size % blockSize);
      }
      continue;
    }

    if (size > 0) {
      const content = buffer.slice(offset, offset + size);
      files.push({
        path: name,
        file: new File([content], name.split('/').pop(), {
          type: 'application/octet-stream',
          lastModified: Date.now()
        })
      });
      offset += size;
      // Skip padding
      if (size % blockSize !== 0) {
        offset += blockSize - (size % blockSize);
      }
    }
  }

  return files;
};

// Main extraction function with filtering
export const extractArchive = async (file) => {
  try {
    // Handle ZIP files
    if (file.name.match(/\.zip$/i)) {
      const zip = await JSZip.loadAsync(file);
      const files = [];
      
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        // Skip macOS resource fork files and directories
        if (relativePath.startsWith('__MACOSX/') || 
            relativePath.includes('/__MACOSX/') || 
            relativePath.startsWith('._') || 
            relativePath.includes('/._') ||
            zipEntry.dir) {
          continue;
        }
        
        const content = await zipEntry.async('blob');
        files.push({
          path: relativePath,
          file: new File([content], relativePath.split('/').pop(), {
            type: content.type,
            lastModified: file.lastModified
          })
        });
      }
      
      return files;
    }
    
    // Handle TAR files
    if (file.name.match(/\.tar$/i)) {
      const arrayBuffer = await file.arrayBuffer();
      return parseTar(arrayBuffer);
    }
    
    // Handle GZipped TAR files (.tar.gz, .tgz)
    if (file.name.match(/\.tar\.gz$|\.tgz$/i)) {
      const arrayBuffer = await file.arrayBuffer();
      const ungzipped = pako.ungzip(new Uint8Array(arrayBuffer));
      return parseTar(ungzipped.buffer);
    }
    
    // Handle single GZ files
    if (file.name.match(/\.gz$/i) && !file.name.match(/\.tar\.gz$|\.tgz$/i)) {
      const arrayBuffer = await file.arrayBuffer();
      const ungzipped = pako.ungzip(new Uint8Array(arrayBuffer));
      const fileName = file.name.replace(/\.gz$/i, '');
      
      // Skip macOS resource fork files
      if (fileName.startsWith('._')) {
        return [];
      }
      
      return [{
        path: fileName,
        file: new File([ungzipped], fileName, {
          type: 'application/octet-stream',
          lastModified: file.lastModified
        })
      }];
    }
    
    // Regular files (shouldn't reach here for archives)
    if (file.name.startsWith('._')) {
      return [];
    }
    
    return [{
      path: file.name,
      file
    }];
  } catch (err) {
    console.error(`Error extracting ${file.name}:`, err);
    throw new Error(`Failed to extract archive: ${err.message}`);
  }
};

// Helper for directory processing (fixed to handle all files)
const getFilesRecursively = async (entry, path = '') => {
  return new Promise(async (resolve) => {
    if (entry.isDirectory) {
      const files = [];
      const reader = entry.createReader();
      let entries = [];
      
      // Fixed: Read ALL directory entries in batches
      let batch;
      do {
        batch = await new Promise(res => reader.readEntries(res));
        entries = [...entries, ...batch];
      } while (batch.length > 0);

      // Process all entries in parallel
      const promises = entries.map(async (e) => {
        const nestedFiles = await getFilesRecursively(e, `${path}${entry.name}/`);
        return nestedFiles;
      });
      
      const results = await Promise.all(promises);
      resolve(results.flat());
    } else {
      // Skip macOS resource fork files only
      if (!entry.name.startsWith('._')) {
        resolve([{
          path: `${path}${entry.name}`,
          file: await new Promise((resolve) => entry.file(resolve))
        }]);
      } else {
        resolve([]);
      }
    }
  });
};
