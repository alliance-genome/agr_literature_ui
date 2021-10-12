import { combineReducers } from 'redux';
import counterReducer from './counterReducer';
import loggedReducer from './isLoggedReducer';
import queryReducer from './queryReducer';
import biblioReducer from './biblioReducer';
import createReducer from './createReducer';
import mergeReducer from './mergeReducer';


export default combineReducers({
  counter: counterReducer,
  isLogged: loggedReducer,
  //login: isLoggedReducer
  query: queryReducer,
  biblio: biblioReducer,
  create: createReducer,
  merge: mergeReducer
});
