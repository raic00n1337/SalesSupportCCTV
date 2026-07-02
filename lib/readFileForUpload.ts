// Client-side helper to read a File for upload to the CSV/Excel compiler APIs.
// Excel files (.xlsx/.xls) are binary, so `readAsText` corrupts them - they
// must be read as base64 and decoded server-side before being handed to
// `compileFile` (see lib/csvCompiler.ts, which expects an ArrayBuffer for
// Excel). CSV files are plain text and are sent as-is.

export interface FileUploadPayload {
  fileContent: string;
  isBase64: boolean;
}

const isExcelFile = (fileName: string): boolean => /\.(xlsx|xls)$/i.test(fileName);

const readAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file);
  });

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // dataUrl looks like "data:<mime>;base64,<data>" - strip the prefix.
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });

export async function readFileForUpload(file: File): Promise<FileUploadPayload> {
  if (isExcelFile(file.name)) {
    return { fileContent: await readAsBase64(file), isBase64: true };
  }
  return { fileContent: await readAsText(file), isBase64: false };
}
