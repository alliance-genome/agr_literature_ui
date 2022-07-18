// import history from "../history";

// import notGithubVariables from './notGithubVariables';

import axios from "axios";

const restUrl = process.env.REACT_APP_RESTAPI;

export const downloadActionButtonDownload = (accessToken, mod, nightlyOrOndemand) => dispatch => {
  // console.log('in downloadActionButtonDownload action');
  // console.log(accessToken);

  if (nightlyOrOndemand === 'nightly') {
    dispatch({ type: 'DOWNLOAD_SET_IS_DOWNLOADING_NIGHTLY', payload: true }); }
  else if (nightlyOrOndemand === 'ondemand') {
    dispatch({ type: 'DOWNLOAD_SET_IS_DOWNLOADING_ONDEMAND', payload: true }); }
  dispatch({ type: 'DOWNLOAD_SET_SHOW_DOWNLOADING', payload: true });

  const downloadFile = async () => {

    // use real url when api on prod
    const url = restUrl + '/reference/dumps/latest/' + mod;
    // const url = 'https://dev4006-literature-rest.alliancegenome.org/reference/dumps/latest/' + mod;
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

        if (nightlyOrOndemand === 'nightly') {
          dispatch({ type: 'DOWNLOAD_SET_IS_DOWNLOADING_NIGHTLY', payload: false }); }
        else if (nightlyOrOndemand === 'ondemand') {
          dispatch({ type: 'DOWNLOAD_SET_AUTO_DOWNLOAD_ONDEMAND', payload: false });
          dispatch({ type: 'DOWNLOAD_SET_IS_DOWNLOADING_ONDEMAND', payload: false }); }
        // dispatch({ type: 'DOWNLOAD_SET_SHOW_DOWNLOADING', payload: false });	// do not make this go away, awkward if fast download
        // Clean up and remove the link
        link.parentNode.removeChild(link);
    });

  }
  downloadFile()
};


export const changeFieldDownloadMod = (e) => {
  console.log('action change field ' + e.target.name + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD_DOWNLOAD_MOD',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const setDownloadShowDownloading = (value) => {
  console.log('action change download show download to ' + value);
  return {
    type: 'DOWNLOAD_SET_SHOW_DOWNLOADING',
    payload: value
  };
};
