import deepFreeze from 'deep-freeze';

const parseJson = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return undefined;
  }
};

const config = {
  token: process.env.REACT_APP_GIT_TOKEN,
  owner: process.env.REACT_APP_GIT_OWNER,
  scanRepos: parseJson(process.env.REACT_APP_SCAN_REPOS),
  dirPath: process.env.REACT_APP_DIR_PATH,
};
if (process.env.NODE_ENV === 'production') {
  deepFreeze(config);
}

export default config;
