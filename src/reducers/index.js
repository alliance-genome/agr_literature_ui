import { combineReducers } from 'redux';
import counterReducer from './counterReducer';
import loggedReducer from './isLoggedReducer';
import crossRefCurieQueryReducer from './crossRefCurieQueryReducer';
import biblioReducer from './biblioReducer';

export default combineReducers({
  counter: counterReducer,
  isLogged: loggedReducer,
  crossRefCurieQuery: crossRefCurieQueryReducer,
  biblio: biblioReducer
});
