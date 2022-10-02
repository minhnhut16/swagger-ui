import './App.css';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import 'antd/dist/antd.css';
import { GitFiles } from 'gitAPI';
import config from 'clientConfig';
import { useEffect, useState } from 'react';
import { Select, Spin } from 'antd';
import isEmpty from 'lodash/isEmpty';

function App() {
  const [dataFiles, setDataFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const gitFiles = new GitFiles({
        repoNames: config.scanRepos,
        gitConfig: { auth: config.token },
        owner: config.owner,
        dirPath: config.dirPath,
      });
      const curData = await gitFiles.getMappingFilesFromRepos();
      setDataFiles(curData);

      // set 1 first default url
      if (!isEmpty(curData)) {
        const objVal = curData[Object.keys(curData)[0]];
        if (!isEmpty(objVal)) {
          setUrl(objVal[0].url);
        }
      }
      setLoading(false);
    };

    getData();
  }, []);

  return (
    <div className="App">
      <Select
        style={{ width: 200, margin: 20 }}
        disabled={loading}
        onChange={(value) => setUrl(value)}
        value={url}
      >
        {Object.entries(dataFiles).map(([key, val]) => (
          <Select.OptGroup key={key} label={key}>
            {val.map((item) => (
              <Select.Option value={item.url} key={item.url}>
                {item.name}
              </Select.Option>
            ))}
          </Select.OptGroup>
        ))}
      </Select>
      {loading ? <Spin /> : <SwaggerUI url={url} />}
    </div>
  );
}

export default App;
