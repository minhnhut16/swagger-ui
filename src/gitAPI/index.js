import { Octokit } from '@octokit/rest';
import mime from 'mime';

export class GitFiles {
  #octokitInstance;

  #dirPath;

  #repoNames;

  #owner;

  #filePattern;

  constructor({ gitConfig, dirPath, repoNames, filePattern = '.+', owner }) {
    this.#octokitInstance = new Octokit(gitConfig);
    this.#dirPath = dirPath;
    this.#repoNames = repoNames;
    this.#filePattern = filePattern;
    this.#owner = owner;
    this.getMappingFilesFromRepos = this.getMappingFilesFromRepos.bind(this);
  }

  // receive an array of content of a repo => filter the content that is file (not module) and match the filePattern, after that transform the file blob to a client url
  async #getFiles(repoName, data = []) {
    const res = [];
    const instance = this;

    const promises = [];
    data.forEach((content) => {
      if (content?.type === 'file' && content?.name.match(instance.#filePattern)) {
        promises.push(
          instance.#octokitInstance.git.getBlob({
            owner: instance.#owner,
            repo: repoName,
            file_sha: content?.sha,
          })
        );
      }
    });

    let fileBlobs = await Promise.allSettled(promises);
    fileBlobs = fileBlobs
      .map((item, idx) => ({ ...item, name: data[idx]?.name, data: item.value }))
      .filter((item) => item.status === 'fulfilled');

    fileBlobs.forEach((item) => {
      const itemData = item?.value;
      res.push({ name: item.name, url: convertBase64ToUrl(itemData?.data?.content, item.name) });
    });

    return res;
  }

  // receive an array of repos data ==> return a mapping of every repo name to an array of file
  async #mappingFiles(data = []) {
    const instance = this;
    const res = {};

    const promises = data.map((item) => {
      const gitContents = item?.data || [];
      return instance.#getFiles(item.name, gitContents);
    });

    const allFile = await Promise.allSettled(promises);

    allFile.forEach((item, idx) => {
      res[data[idx].name] = item.value;
    });

    return res;
  }

  async getMappingFilesFromRepos() {
    try {
      const instance = this;
      const repoModule = instance.#octokitInstance.rest.repos;

      const promises = instance.#repoNames.map((name) =>
        repoModule.getContent({ owner: instance.#owner, repo: name, path: instance.#dirPath })
      );

      let data = await Promise.allSettled(promises);

      data = data
        .map((item, idx) => ({ ...item, name: instance.#repoNames[idx], data: item.value?.data }))
        .filter((item) => item.status === 'fulfilled');

      const res = await instance.#mappingFiles(data);

      return res;
    } catch (error) {
      console.log(error);
    }

    return {};
  }
}

function convertFilenameToType(filename) {
  return mime.getType(readfileExtention(filename));
}

function readfileExtention(filename) {
  const arr = filename.split('.');
  if (arr.length < 2) {
    return '';
  }
  return arr.pop();
}

function convertBase64ToUrl(b64Data, filename, sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: convertFilenameToType(filename) });
  const blobUrl = URL.createObjectURL(blob);

  return blobUrl;
}
