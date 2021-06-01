import { combineReducers } from 'redux';
import counterReducer from './counterReducer';
import loggedReducer from './isLoggedReducer';

export default combineReducers({
  counter: counterReducer,
  isLogged: loggedReducer
});
