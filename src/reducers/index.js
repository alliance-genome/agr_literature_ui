import { combineReducers } from 'redux';
import appReducer from './appReducer';
import counterReducer from './counterReducer';
import loggedReducer from './isLoggedReducer';
import searchReducer from './searchReducer';
import biblioReducer from './biblioReducer';
import sortReducer from './sortReducer';
import createReducer from './createReducer';
import mergeReducer from './mergeReducer';
import downloadReducer from './downloadReducer';
import trackerReducer from './trackerReducer';


export default combineReducers({
  app: appReducer,
  counter: counterReducer,
  isLogged: loggedReducer,
  //login: isLoggedReducer
  search: searchReducer,
  biblio: biblioReducer,
  sort: sortReducer,
  create: createReducer,
  merge: mergeReducer,
  download: downloadReducer,
  tracker: trackerReducer
});
