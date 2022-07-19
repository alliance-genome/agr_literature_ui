
const initialState = {
  mod: 'miniSGD',
  showGenericModal: false,
  genericModalHeader: '',
  genericModalBody: '',
//   showDownloadingModal: false,
  showGeneratingModal: false,
  autoDownloadOndemand: true,
  isDownloadingOndemand: false,
  isDownloadingNightly: false
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {

    case 'DOWNLOAD_SET_IS_DOWNLOADING_NIGHTLY':
      // console.log(action.payload);
      return {
        ...state,
        isDownloadingNightly: action.payload
      }

    case 'DOWNLOAD_SET_IS_DOWNLOADING_ONDEMAND':
      // console.log(action.payload);
      return {
        ...state,
        isDownloadingOndemand: action.payload
      }

    case 'DOWNLOAD_SET_AUTO_DOWNLOAD_ONDEMAND':
      // console.log(action.payload);
      return {
        ...state,
        autoDownloadOndemand: action.payload
      }

    case 'DOWNLOAD_SET_SHOW_GENERIC':
      // console.log(action.payload);
      return {
        ...state,
        showGenericModal: action.payload
      }

    case 'DOWNLOAD_UPDATE_GENERIC_MODAL':
      // console.log(action.payload);
      return {
        ...state,
        showGenericModal: true,
        genericModalHeader: action.payload.modalHeader,
        genericModalBody: action.payload.modalBody
      }

//     case 'DOWNLOAD_SET_SHOW_DOWNLOADING':
//       // console.log(action.payload);
//       return {
//         ...state,
//         showDownloadingModal: action.payload
//       }

//     case 'DOWNLOAD_SET_SHOW_GENERATING':
//       // console.log(action.payload);
//       return {
//         ...state,
//         showGeneratingModal: action.payload
//       }

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
  
