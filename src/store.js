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

// Enable Redux DevTools Extension
// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
// export const store = createStore(
//     rootReducer,
//     initialState,
//     composeEnhancers(
//         applyMiddleware(...middleware)
//     )
// );

// Expose store for debugging in dev environment
if (process.env.REACT_APP_DEV_OR_STAGE_OR_PROD !== 'prod') {
    window.store = store;
}

export default store;
