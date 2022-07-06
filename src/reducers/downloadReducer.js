
const initialState = {
  mod: 'miniSGD',
  showDownloadingModal: false,
  isDownloading: false
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {

    case 'DOWNLOAD_SET_IS_DOWNLOADING':
      // console.log(action.payload);
      return {
        ...state,
        isDownloading: action.payload
      }

    case 'DOWNLOAD_SET_SHOW_DOWNLOADING':
      // console.log(action.payload);
      return {
        ...state,
        showDownloadingModal: action.payload
      }

    case 'CHANGE_FIELD_DOWNLOAD_MOD':
      // console.log(action.payload);
      return {
        ...state,
        mod: action.payload.value
      }

    default:
      return state;
  }
}
  
