// import history from "../history";

// import notGithubVariables from './notGithubVariables';

import axios from "axios";

// const restUrl = process.env.REACT_APP_RESTAPI;

export const downloadButtonDownload = (accessToken, mod) => dispatch => {
  console.log('in downloadButtonDownload action');
  console.log(accessToken);

  const downloadFile = async () => {

    // use real url when api on prod
    // const url = restUrl + '/dumps/latest/' + mod;
    const url = 'https://dev4006-literature-rest.alliancegenome.org/reference/dumps/latest/miniSGD';
    const filename = 'reference_dump_' + mod;

    axios({
        url: url,
        method: "GET",
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + accessToken
        },
        responseType: "blob" // important
    }).then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            filename
        );
        document.body.appendChild(link);
        link.click();

        // Clean up and remove the link
        link.parentNode.removeChild(link);
    });

    // test just getting stuff
    // const url = restUrl + '/' + subPath;
//     console.log(url);
//     const res = await fetch(url, {
//       method: 'GET',
//       mode: 'cors',
//       headers: {
//         'content-type': 'application/json',
//         'authorization': 'Bearer ' + accessToken
//       },
//     })
// //       body: JSON.stringify( payload )
// 
//     let response_message = 'file download success';
//     console.log(res);

  }
  downloadFile()
};
