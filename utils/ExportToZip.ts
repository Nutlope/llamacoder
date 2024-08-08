import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FilesObject {
  [fileName: string]: string;
}

const ExportCode = async (files: FilesObject,Filename:String="files"): Promise<void> => {
  const zip = new JSZip();

  // Iterate over the object and add files to the zip
  Object.keys(files).forEach(fileName => {
    zip.file(fileName, files[fileName]);
  });

  // Generate the zip file and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, Filename.trim()+'.zip');
};

export default ExportCode;