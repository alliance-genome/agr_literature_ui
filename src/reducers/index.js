import { combineReducers } from 'redux';
import counterReducer from './counterReducer';
import loggedReducer from './isLoggedReducer';
import searchReducer from './searchReducer';
import biblioReducer from './biblioReducer';
import sortReducer from './sortReducer';
import createReducer from './createReducer';
import mergeReducer from './mergeReducer';


export default combineReducers({
  counter: counterReducer,
  isLogged: loggedReducer,
  //login: isLoggedReducer
  search: searchReducer,
  biblio: biblioReducer,
  sort: sortReducer,
  create: createReducer,
  merge: mergeReducer
});
