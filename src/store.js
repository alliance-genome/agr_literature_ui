import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

const initialState = {};
const middleware = [thunk];

export const store = createStore(
    rootReducer,
    initialState,
    compose(
        applyMiddleware(...middleware)
    )
);

// Expose store for debugging in dev environment
if (process.env.REACT_APP_DEV_OR_STAGE_OR_PROD !== 'prod') {
    window.store = store;
}

export default store;
